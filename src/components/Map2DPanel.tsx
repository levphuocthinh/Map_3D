import React, { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  Search,
  X,
  Square,
  Pentagon,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Navigation,
  Locate,
  Loader2,
} from 'lucide-react';
import { BoundingBox, CityModelData, SearchSuggestion } from '../types';
import {
  MAPBOX_ACCESS_TOKEN,
  MapboxExtractedData,
  metersToLatLon,
  searchPlaces,
} from '../services/cityBuilder';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

interface Map2DPanelProps {
  bbox: BoundingBox;
  regionTitle: string;
  cityData?: CityModelData | null;
  onSelectBBox: (
    bbox: BoundingBox,
    title: string,
    mapboxData?: MapboxExtractedData | null
  ) => void;
}

// Extract real buildings, roads, rivers, lakes, parks, and POIs from Mapbox GL's loaded vector tiles!
function extractFeaturesFromMapbox(
  map: mapboxgl.Map,
  bbox: BoundingBox
): MapboxExtractedData {
  const result: MapboxExtractedData = {
    buildings: [],
    roads: [],
    waters: [],
    parks: [],
    pois: [],
  };

  try {
    const pad = 0.0028;
    const inBBox = (lon: number, lat: number) =>
      lat >= bbox.south - pad &&
      lat <= bbox.north + pad &&
      lon >= bbox.west - pad &&
      lon <= bbox.east + pad;

    const ringOverlapsBBox = (pts: [number, number][]) => {
      let minLon = Infinity,
        maxLon = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const [lon, lat] = pts[i];
        if (inBBox(lon, lat)) return true;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      return (
        maxLon >= bbox.west - pad &&
        minLon <= bbox.east + pad &&
        maxLat >= bbox.south - pad &&
        minLat <= bbox.north + pad
      );
    };

    // 1. Buildings from Mapbox 'composite' vector source (both source & rendered tiles!)
    const seenBuildings = new Set<string>();

    const processBuildingFeature = (f: any) => {
      const geom = f.geometry as any;
      if (!geom) return;
      const polys: [number, number][][] =
        geom.type === 'Polygon'
          ? [geom.coordinates[0]]
          : geom.type === 'MultiPolygon'
          ? geom.coordinates.map((p: any) => p[0])
          : [];

      for (const ring of polys) {
        if (!ring || ring.length < 3) continue;
        let sumLon = 0,
          sumLat = 0;
        for (let k = 0; k < ring.length; k++) {
          sumLon += ring[k][0];
          sumLat += ring[k][1];
        }
        const cLon = sumLon / ring.length;
        const cLat = sumLat / ring.length;
        if (!inBBox(cLon, cLat) && !ringOverlapsBBox(ring)) continue;

        const props = f.properties || {};
        const hVal = typeof props.height === 'number' ? props.height : 0;
        const minHVal =
          typeof props.min_height === 'number' ? props.min_height : 0;
        const key = `${cLon.toFixed(5)},${cLat.toFixed(5)},${Math.round(
          hVal
        )},${Math.round(minHVal)}`;
        if (seenBuildings.has(key)) continue;
        seenBuildings.add(key);

        const bName =
          props.name ||
          props['name:vi'] ||
          props.name_vi ||
          props.name_en ||
          undefined;

        result.buildings.push({
          id: `mb-b-${seenBuildings.size}`,
          coords: ring as [number, number][],
          height: hVal > 0 ? hVal : undefined,
          minHeight: minHVal > 0 ? minHVal : undefined,
          type: props.type,
          name: bName,
        });
      }
    };

    // A. Query source features across all loaded composite tiles
    try {
      const rawBuildings = map.querySourceFeatures('composite', {
        sourceLayer: 'building',
      });
      for (let i = 0; i < rawBuildings.length; i++) {
        processBuildingFeature(rawBuildings[i]);
      }
    } catch {}

    // B. Query currently rendered features within viewport bounding box
    try {
      const p1 = map.project([bbox.west, bbox.north]);
      const p2 = map.project([bbox.east, bbox.south]);
      const canvas = map.getCanvas();
      const minX = Math.max(0, Math.min(p1.x, p2.x) - 50);
      const maxX = Math.min(canvas.width, Math.max(p1.x, p2.x) + 50);
      const minY = Math.max(0, Math.min(p1.y, p2.y) - 50);
      const maxY = Math.min(canvas.height, Math.max(p1.y, p2.y) + 50);

      const renderedBuildings = map.queryRenderedFeatures(
        [
          [minX, minY],
          [maxX, maxY],
        ],
        {
          layers: ['building', '3d-buildings'].filter((l) => map.getLayer(l)),
        }
      );
      for (let i = 0; i < renderedBuildings.length; i++) {
        processBuildingFeature(renderedBuildings[i]);
      }
    } catch {}

    // 2. Roads & Bridges from Mapbox 'composite' vector source (preserving full segment continuity across bbox!)
    const rawRoads = map.querySourceFeatures('composite', {
      sourceLayer: 'road',
    });
    const seenRoads = new Set<string>();

    for (let i = 0; i < rawRoads.length; i++) {
      const f = rawRoads[i];
      const geom = f.geometry as any;
      if (!geom) continue;
      const props = f.properties || {};
      const rClass = String(props.class || 'street');
      if (
        rClass === 'path' ||
        rClass === 'pedestrian' ||
        rClass === 'steps' ||
        rClass === 'track'
      ) {
        continue;
      }

      const lines: [number, number][][] =
        geom.type === 'LineString'
          ? [geom.coordinates]
          : geom.type === 'MultiLineString'
          ? geom.coordinates
          : [];

      for (const line of lines) {
        if (!line || line.length < 2) continue;
        if (!ringOverlapsBBox(line)) continue;

        const firstPt = line[0];
        const lastPt = line[line.length - 1];
        const midPt = line[Math.floor(line.length / 2)];
        const key = `${rClass}-${firstPt[0].toFixed(4)},${firstPt[1].toFixed(
          4
        )}-${midPt[0].toFixed(4)},${midPt[1].toFixed(4)}-${lastPt[0].toFixed(
          4
        )},${lastPt[1].toFixed(4)}`;
        if (seenRoads.has(key)) continue;
        seenRoads.add(key);

        const isBridge = props.structure === 'bridge';
        const layer =
          typeof props.layer === 'number'
            ? Math.max(isBridge ? 1 : 0, props.layer)
            : isBridge
            ? 1
            : 0;

        result.roads.push({
          id: `mb-r-${seenRoads.size}`,
          coords: line,
          roadClass: rClass,
          isBridge,
          layer,
          name: props.name_vi || props.name || props['name:vi'],
        });
      }
    }

    // 3. Water Polygons (Rivers, Canals, Lakes) with interior holes preserved
    const rawWater = map.querySourceFeatures('composite', {
      sourceLayer: 'water',
    });
    const seenWater = new Set<string>();
    for (let i = 0; i < rawWater.length; i++) {
      const f = rawWater[i];
      const geom = f.geometry as any;
      if (!geom) continue;
      const polyList: {
        outer: [number, number][];
        holes: [number, number][][];
      }[] =
        geom.type === 'Polygon'
          ? [{ outer: geom.coordinates[0], holes: geom.coordinates.slice(1) }]
          : geom.type === 'MultiPolygon'
          ? geom.coordinates.map((p: any) => ({
              outer: p[0],
              holes: p.slice(1),
            }))
          : [];

      for (const poly of polyList) {
        const ring = poly.outer;
        if (!ring || ring.length < 3) continue;
        if (!ringOverlapsBBox(ring)) continue;
        const key = `${ring[0][0].toFixed(4)},${ring[0][1].toFixed(4)}-${ring.length}`;
        if (seenWater.has(key)) continue;
        seenWater.add(key);

        result.waters.push({
          id: `mb-w-${seenWater.size}`,
          coords: ring,
          holes: poly.holes.length > 0 ? poly.holes : undefined,
          isPolygon: true,
          width: 24,
        });
      }
    }

    // 4. Waterway Centerlines (Streams/Canals)
    const rawWaterways = map.querySourceFeatures('composite', {
      sourceLayer: 'waterway',
    });
    for (let i = 0; i < rawWaterways.length; i++) {
      const f = rawWaterways[i];
      const geom = f.geometry as any;
      if (!geom || geom.type !== 'LineString') continue;
      if (!ringOverlapsBBox(geom.coordinates)) continue;
      const props = f.properties || {};
      result.waters.push({
        id: `mb-ww-${i}`,
        coords: geom.coordinates,
        isPolygon: false,
        width: props.class === 'river' ? 26 : 16,
        name: props.name_vi || props.name,
      });
    }

    // 5. Parks & Green Landuse
    const rawLanduse = map.querySourceFeatures('composite', {
      sourceLayer: 'landuse',
    });
    const seenParks = new Set<string>();
    for (let i = 0; i < rawLanduse.length; i++) {
      const f = rawLanduse[i];
      const props = f.properties || {};
      if (
        props.class !== 'park' &&
        props.class !== 'grass' &&
        props.class !== 'pitch' &&
        props.class !== 'wood'
      ) {
        continue;
      }
      const geom = f.geometry as any;
      if (!geom || geom.type !== 'Polygon') continue;
      const ring = geom.coordinates[0];
      if (!ring || ring.length < 3) continue;
      if (!ringOverlapsBBox(ring)) continue;
      const key = `${ring[0][0].toFixed(4)},${ring[0][1].toFixed(4)}`;
      if (seenParks.has(key)) continue;
      seenParks.add(key);

      result.parks.push({
        id: `mb-p-${seenParks.size}`,
        coords: ring,
      });
    }

    // 6. POI Labels
    const rawPois = map.querySourceFeatures('composite', {
      sourceLayer: 'poi_label',
    });
    const seenPois = new Set<string>();
    for (let i = 0; i < rawPois.length; i++) {
      const f = rawPois[i];
      const geom = f.geometry as any;
      const props = f.properties || {};
      const name = props.name_vi || props.name;
      if (!name || !geom || geom.type !== 'Point') continue;
      const [lon, lat] = geom.coordinates;
      if (!inBBox(lon, lat) || seenPois.has(name)) continue;
      seenPois.add(name);
      result.pois.push({
        id: `mb-poi-${seenPois.size}`,
        name,
        lon,
        lat,
        category: props.class || 'poi',
      });
      if (result.pois.length >= 10) break;
    }
  } catch {
    // Fallback if style is still loading
  }

  return result;
}

export const Map2DPanel: React.FC<Map2DPanelProps> = ({
  bbox,
  regionTitle,
  cityData,
  onSelectBBox,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const cornerMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const lastExtractedBBoxKeyRef = useRef<string>('');

  const getBBoxKey = (b: BoundingBox) =>
    `${b.south.toFixed(4)},${b.west.toFixed(4)},${b.north.toFixed(
      4
    )},${b.east.toFixed(4)}`;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [drawMode, setDrawMode] = useState<'none' | 'rect'>('none');
  const drawStartRef = useRef<[number, number] | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // User Geolocation State & Permission Prompt
  const [isLocating, setIsLocating] = useState(false);
  const [showGeoPrompt, setShowGeoPrompt] = useState(false);
  const [geoStatusMsg, setGeoStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSatellite, setIsSatellite] = useState(true);
  const bboxRef = useRef<BoundingBox>(bbox);
  bboxRef.current = bbox;
  const cityDataRef = useRef<CityModelData | null | undefined>(cityData);
  cityDataRef.current = cityData;

  // Prompt user on initial mount asking if they want to explore their current location
  useEffect(() => {
    const dismissed = sessionStorage.getItem('tiny_map_geo_prompt_dismissed');
    if (!dismissed && 'geolocation' in navigator) {
      const timer = setTimeout(() => {
        setShowGeoPrompt(true);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, []);

  const emitSelectionWithMapboxData = useCallback(
    (targetBBox: BoundingBox, title: string, fly = true) => {
      const map = mapRef.current;
      lastExtractedBBoxKeyRef.current = getBBoxKey(targetBBox);
      if (!map) {
        onSelectBBox(targetBBox, title, null);
        return;
      }

      let handled = false;
      let retried = false;

      const doExtract = () => {
        const mbData = extractFeaturesFromMapbox(map, targetBBox);
        if (
          !retried &&
          mbData.buildings.length < 15 &&
          mbData.roads.length < 5
        ) {
          retried = true;
          setTimeout(() => {
            const retryData = extractFeaturesFromMapbox(map, targetBBox);
            onSelectBBox(targetBBox, title, retryData);
          }, 420);
          return;
        }
        onSelectBBox(targetBBox, title, mbData);
      };

      const onMapIdle = () => {
        if (handled) return;
        handled = true;
        map.off('idle', onMapIdle);
        clearTimeout(safetyTimer);
        doExtract();
      };

      // Fit bounds with tight padding so zoom stays >= 15 (where Mapbox vector tiles contain 100% of buildings & streets!)
      map.fitBounds(
        [
          [targetBBox.west, targetBBox.south],
          [targetBBox.east, targetBBox.north],
        ],
        { padding: 20, maxZoom: 16.5, duration: fly ? 220 : 80 }
      );

      setTimeout(() => {
        try {
          if (map.getZoom() < 15.05) {
            map.setZoom(15.05);
          }
        } catch {}
        map.once('idle', onMapIdle);
      }, fly ? 240 : 100);

      const safetyTimer = setTimeout(onMapIdle, 2100);
    },
    [onSelectBBox]
  );

  // Request browser geolocation to locate user, drop GPS marker and build 3D around them
  const handleLocateUser = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoStatusMsg({ text: 'Trình duyệt không hỗ trợ định vị GPS.', isError: true });
      setTimeout(() => setGeoStatusMsg(null), 4000);
      return;
    }

    setIsLocating(true);
    setGeoStatusMsg({ text: 'Đang kết nối GPS và định vị vị trí của bạn...' });
    setShowGeoPrompt(false);
    sessionStorage.setItem('tiny_map_geo_prompt_dismissed', '1');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const map = mapRef.current;

        if (map) {
          if (!userLocationMarkerRef.current) {
            const el = document.createElement('div');
            el.className = 'relative flex items-center justify-center';
            el.innerHTML = `
              <div style="position:absolute;width:32px;height:32px;border-radius:9999px;background:rgba(56,189,248,0.35);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <div style="position:relative;width:14px;height:14px;border-radius:9999px;background:#0284c7;border:2.5px solid #ffffff;box-shadow:0 0 10px rgba(2,132,199,0.8);"></div>
            `;
            userLocationMarkerRef.current = new mapboxgl.Marker({ element: el })
              .setLngLat([lon, lat])
              .addTo(map);
          } else {
            userLocationMarkerRef.current.setLngLat([lon, lat]);
          }
        }

        const dLat = 0.0035;
        const dLon = 0.0045;
        const userBBox: BoundingBox = {
          south: lat - dLat,
          north: lat + dLat,
          west: lon - dLon,
          east: lon + dLon,
        };

        let locationName = 'Vị trí của bạn';
        try {
          const revRes = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=vn&language=vi&limit=1`
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            if (revData.features && revData.features[0]?.text) {
              locationName = `Vị trí của bạn (${revData.features[0].text})`;
            }
          }
        } catch {}

        setGeoStatusMsg({ text: `Đã xác định vị trí: ${locationName}` });
        setTimeout(() => setGeoStatusMsg(null), 3500);

        emitSelectionWithMapboxData(userBBox, locationName, true);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Không thể lấy vị trí hiện tại.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Quyền truy cập vị trí bị từ chối trong trình duyệt.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Quá thời gian lấy tọa độ GPS.';
        }
        setGeoStatusMsg({ text: msg, isError: true });
        setTimeout(() => setGeoStatusMsg(null), 4500);
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 30000,
      }
    );
  }, [emitSelectionWithMapboxData]);

  // Initialize Mapbox GL JS Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const cLat = (bbox.south + bbox.north) / 2;
    const cLon = (bbox.west + bbox.east) / 2;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [cLon, cLat],
      zoom: 15.6,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    mapRef.current = map;

    const ensureCustomSourcesAndLayers = () => {
      if (map.getLayer('building')) {
        try {
          map.setLayerZoomRange('building', 13, 24);
          map.setPaintProperty('building', 'fill-color', '#334155');
          map.setPaintProperty('building', 'fill-opacity', 0.45);
          map.setPaintProperty('building', 'fill-outline-color', '#475569');
        } catch {}
      }

      if (!map.getSource('city-buildings-2d-source')) {
        map.addSource('city-buildings-2d-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });
      }

      if (!map.getLayer('city-buildings-2d-fill')) {
        map.addLayer({
          id: 'city-buildings-2d-fill',
          type: 'fill',
          source: 'city-buildings-2d-source',
          paint: {
            'fill-color': '#fef08a',
            'fill-opacity': 0.16,
          },
        });
      }

      if (!map.getLayer('city-buildings-2d-outline')) {
        map.addLayer({
          id: 'city-buildings-2d-outline',
          type: 'line',
          source: 'city-buildings-2d-source',
          paint: {
            'line-color': '#fde047',
            'line-width': 0.85,
            'line-opacity': 0.48,
          },
        });
      }

      const curB = bboxRef.current;
      if (!map.getSource('bbox-source')) {
        map.addSource('bbox-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [curB.west, curB.north],
                  [curB.east, curB.north],
                  [curB.east, curB.south],
                  [curB.west, curB.south],
                  [curB.west, curB.north],
                ],
              ],
            },
            properties: {},
          },
        });
      }

      if (!map.getLayer('bbox-fill')) {
        map.addLayer({
          id: 'bbox-fill',
          type: 'fill',
          source: 'bbox-source',
          paint: {
            'fill-color': '#ea580c',
            'fill-opacity': 0.18,
          },
        });
      }

      if (!map.getLayer('bbox-outline')) {
        map.addLayer({
          id: 'bbox-outline',
          type: 'line',
          source: 'bbox-source',
          paint: {
            'line-color': '#fb923c',
            'line-width': 2.4,
          },
        });
      }

      // Restore 2D building footprints if cityData is already present
      const curCity = cityDataRef.current;
      const bSrc = map.getSource('city-buildings-2d-source') as mapboxgl.GeoJSONSource;
      if (curCity && bSrc) {
        const features = curCity.buildings.map((b) => {
          const ring = b.footprint.map(([lx, lz]) => {
            const [lat, lon] = metersToLatLon(
              lx,
              lz,
              curCity.centerLat,
              curCity.centerLon
            );
            return [lon, lat];
          });
          if (ring.length > 0) ring.push([ring[0][0], ring[0][1]]);
          return {
            type: 'Feature' as const,
            geometry: { type: 'Polygon' as const, coordinates: [ring] },
            properties: { id: b.id },
          };
        });
        bSrc.setData({ type: 'FeatureCollection', features });
      }
    };

    map.on('style.load', ensureCustomSourcesAndLayers);

    map.on('load', () => {
      ensureCustomSourcesAndLayers();

      // Once initial vector tiles finish loading, extract real Mapbox data for initial region
      map.once('idle', () => {
        const initKey = getBBoxKey(bbox);
        if (lastExtractedBBoxKeyRef.current !== initKey) {
          lastExtractedBBoxKeyRef.current = initKey;
          const mbData = extractFeaturesFromMapbox(map, bbox);
          onSelectBBox(bbox, regionTitle, mbData);
        }
      });
    });

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync real 3D building footprints onto the 2D Mapbox map (never draw generated infill boxes onto 2D map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cityData) return;

    const updateBuildingsLayer = () => {
      const src = map.getSource(
        'city-buildings-2d-source'
      ) as mapboxgl.GeoJSONSource;
      if (!src) return;

      const features = cityData.buildings.map((b) => {
        const ring = b.footprint.map(([lx, lz]) => {
          const [lat, lon] = metersToLatLon(
            lx,
            lz,
            cityData.centerLat,
            cityData.centerLon
          );
          return [lon, lat];
        });
        if (ring.length > 0) {
          ring.push([ring[0][0], ring[0][1]]);
        }
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [ring],
          },
          properties: {
            id: b.id,
          },
        };
      });

      src.setData({
        type: 'FeatureCollection',
        features,
      });
    };

    if (map.isStyleLoaded()) {
      updateBuildingsLayer();
    } else {
      map.once('load', updateBuildingsLayer);
    }
  }, [cityData]);

  // Update Bounding Box Polygon, Draggable Center Pin & 4 Corner Handles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateGeoJson = (b: BoundingBox) => {
      const src = map.getSource('bbox-source') as mapboxgl.GeoJSONSource;
      if (src) {
        src.setData({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [b.west, b.north],
                [b.east, b.north],
                [b.east, b.south],
                [b.west, b.south],
                [b.west, b.north],
              ],
            ],
          },
          properties: {},
        });
      }
    };

    const currentKey = getBBoxKey(bbox);
    if (map.isStyleLoaded()) {
      updateGeoJson(bbox);
      if (lastExtractedBBoxKeyRef.current !== currentKey) {
        emitSelectionWithMapboxData(bbox, regionTitle, true);
      }
    } else {
      map.once('load', () => {
        updateGeoJson(bbox);
        if (lastExtractedBBoxKeyRef.current !== currentKey) {
          emitSelectionWithMapboxData(bbox, regionTitle, true);
        }
      });
    }

    // Clear old markers
    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }
    cornerMarkersRef.current.forEach((m) => m.remove());
    cornerMarkersRef.current = [];

    const cLat = (bbox.south + bbox.north) / 2;
    const cLon = (bbox.west + bbox.east) / 2;
    const spanLat = bbox.north - bbox.south;
    const spanLon = bbox.east - bbox.west;
    const shortLabel = regionTitle.split('–')[0].split(',')[0].trim();

    // Draggable Center Marker (Drag this orange circle to move the entire box anywhere on the map!)
    const pinEl = document.createElement('div');
    pinEl.style.cursor = 'move';
    pinEl.title = 'Kéo tâm này để di chuyển toàn bộ vùng chọn sang khu vực khác';
    pinEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
        <div style="width:16px;height:16px;border-radius:9999px;background:#f97316;border:2.5px solid #fff;box-shadow:0 0 12px rgba(249,115,22,0.95);"></div>
        <span style="margin-top:4px;padding:1px 6px;border-radius:6px;background:rgba(15,23,42,0.85);font-size:11.5px;font-weight:600;color:#f8fafc;white-space:nowrap;border:1px solid rgba(255,255,255,0.12);">${shortLabel}</span>
      </div>
    `;

    const centerMarker = new mapboxgl.Marker({
      element: pinEl,
      draggable: true,
    })
      .setLngLat([cLon, cLat])
      .addTo(map);

    centerMarker.on('drag', () => {
      const lngLat = centerMarker.getLngLat();
      updateGeoJson({
        south: lngLat.lat - spanLat / 2,
        north: lngLat.lat + spanLat / 2,
        west: lngLat.lng - spanLon / 2,
        east: lngLat.lng + spanLon / 2,
      });
    });

    centerMarker.on('dragend', () => {
      const lngLat = centerMarker.getLngLat();
      const movedBBox: BoundingBox = {
        south: lngLat.lat - spanLat / 2,
        north: lngLat.lat + spanLat / 2,
        west: lngLat.lng - spanLon / 2,
        east: lngLat.lng + spanLon / 2,
      };
      emitSelectionWithMapboxData(movedBBox, 'Vùng mới', false);
    });

    centerMarkerRef.current = centerMarker;

    // 4 Draggable Corner Resize Handles
    const corners: [number, number, string][] = [
      [bbox.west, bbox.north, 'nw'],
      [bbox.east, bbox.north, 'ne'],
      [bbox.east, bbox.south, 'se'],
      [bbox.west, bbox.south, 'sw'],
    ];

    corners.forEach(([lon, lat, pos]) => {
      const el = document.createElement('div');
      el.style.width = '11px';
      el.style.height = '11px';
      el.style.background = '#fb923c';
      el.style.border = '2px solid #ffffff';
      el.style.borderRadius = '2px';
      el.style.cursor = 'nwse-resize';
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.65)';

      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([lon, lat])
        .addTo(map);

      marker.on('drag', () => {
        const cur = marker.getLngLat();
        let { south, west, north, east } = bbox;
        if (pos.includes('n')) north = cur.lat;
        if (pos.includes('s')) south = cur.lat;
        if (pos.includes('w')) west = cur.lng;
        if (pos.includes('e')) east = cur.lng;
        updateGeoJson({
          south: Math.min(south, north),
          north: Math.max(south, north),
          west: Math.min(west, east),
          east: Math.max(west, east),
        });
      });

      marker.on('dragend', () => {
        const cur = marker.getLngLat();
        let { south, west, north, east } = bbox;
        if (pos.includes('n')) north = cur.lat;
        if (pos.includes('s')) south = cur.lat;
        if (pos.includes('w')) west = cur.lng;
        if (pos.includes('e')) east = cur.lng;

        const updated: BoundingBox = {
          south: Math.min(south, north),
          north: Math.max(south, north),
          west: Math.min(west, east),
          east: Math.max(west, east),
        };
        emitSelectionWithMapboxData(updated, regionTitle || 'Vùng mới', false);
      });

      cornerMarkersRef.current.push(marker);
    });
  }, [bbox, regionTitle, emitSelectionWithMapboxData]);

  // Handle Rectangle Draw Mode on Mapbox Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const canvas = map.getCanvasContainer();
    if (drawMode === 'rect') {
      map.dragPan.disable();
      canvas.style.cursor = 'crosshair';
    } else {
      map.dragPan.enable();
      canvas.style.cursor = '';
    }

    const onMouseDown = (e: mapboxgl.MapMouseEvent) => {
      if (drawMode !== 'rect') return;
      drawStartRef.current = [e.lngLat.lng, e.lngLat.lat];
    };

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (drawMode !== 'rect' || !drawStartRef.current) return;
      const [lon1, lat1] = drawStartRef.current;
      const lon2 = e.lngLat.lng;
      const lat2 = e.lngLat.lat;
      const src = map.getSource('bbox-source') as mapboxgl.GeoJSONSource;
      if (src) {
        src.setData({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [Math.min(lon1, lon2), Math.max(lat1, lat2)],
                [Math.max(lon1, lon2), Math.max(lat1, lat2)],
                [Math.max(lon1, lon2), Math.min(lat1, lat2)],
                [Math.min(lon1, lon2), Math.min(lat1, lat2)],
                [Math.min(lon1, lon2), Math.max(lat1, lat2)],
              ],
            ],
          },
          properties: {},
        });
      }
    };

    const onMouseUp = (e: mapboxgl.MapMouseEvent) => {
      if (drawMode !== 'rect' || !drawStartRef.current) return;
      const [lon1, lat1] = drawStartRef.current;
      drawStartRef.current = null;
      const lon2 = e.lngLat.lng;
      const lat2 = e.lngLat.lat;

      const south = Math.min(lat1, lat2);
      const north = Math.max(lat1, lat2);
      const west = Math.min(lon1, lon2);
      const east = Math.max(lon1, lon2);

      const minSpan = 0.0028;
      const finalBBox: BoundingBox = {
        south: north - south < minSpan ? (south + north) / 2 - minSpan : south,
        north: north - south < minSpan ? (south + north) / 2 + minSpan : north,
        west:
          east - west < minSpan ? (west + east) / 2 - minSpan * 1.2 : west,
        east:
          east - west < minSpan ? (west + east) / 2 + minSpan * 1.2 : east,
      };

      setDrawMode('none');
      emitSelectionWithMapboxData(finalBBox, 'Vùng mới', false);
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
    };
  }, [drawMode, emitSelectionWithMapboxData]);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        !(document.activeElement instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
        setDrawMode('none');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced Search
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const results = await searchPlaces(query);
      if (active) setSuggestions(results);
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleChooseSuggestion = (item: SearchSuggestion) => {
    setQuery(item.name);
    setShowDropdown(false);

    const dLat = 0.0036;
    const dLon = 0.0046;
    const newBBox: BoundingBox = {
      south: item.lat - dLat,
      north: item.lat + dLat,
      west: item.lon - dLon,
      east: item.lon + dLon,
    };

    emitSelectionWithMapboxData(newBBox, item.name, true);
  };

  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const normText = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
    const normHi = highlight
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');

    const idx = normText.indexOf(normHi);
    if (idx === -1) return <span>{text}</span>;

    return (
      <>
        <span>{text.slice(0, idx)}</span>
        <span className="text-orange-400 font-semibold">
          {text.slice(idx, idx + highlight.trim().length)}
        </span>
        <span>{text.slice(idx + highlight.trim().length)}</span>
      </>
    );
  };

  return (
    <div className="relative w-full h-full bg-[#11161d] select-none overflow-hidden border-r border-white/10">
      {/* Mapbox GL JS 2D Vector Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Search Bar & Autocomplete Dropdown (Top-Left) */}
      <div className="absolute top-3.5 left-3.5 z-20 w-[330px] max-w-[calc(100%-155px)]">
        <div className="relative flex items-center bg-[#141820]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl px-3 py-2 focus-within:border-orange-500/50 transition-colors">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && suggestions.length > 0) {
                handleChooseSuggestion(suggestions[0]);
              }
            }}
            placeholder="Tìm địa điểm (Mapbox + OSM)"
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="px-1.5 py-0.5 text-[11px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">
              /
            </span>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showDropdown && (
          <div className="mt-2 bg-[#141820]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Quick Locate GPS Option */}
            <div
              onClick={handleLocateUser}
              className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-b border-white/5 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-400">
                {isLocating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Locate className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-sky-200">
                  {isLocating ? 'Đang định vị GPS...' : 'Sử dụng vị trí hiện tại của tôi (GPS)'}
                </div>
                <div className="text-[11px] text-sky-400/80">
                  Tự động căn chỉnh và dựng mô hình 3D quanh bạn
                </div>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5">
                {suggestions.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => handleChooseSuggestion(item)}
                    className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${
                      idx === 0
                        ? 'bg-white/[0.08] hover:bg-white/[0.12]'
                        : 'hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-slate-300">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-slate-100 truncate">
                          {renderHighlightedText(item.name, query)}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    {idx === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChooseSuggestion(item);
                        }}
                        className="shrink-0 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-orange-500/20 border border-white/15 hover:border-orange-400/40 text-[11px] font-medium text-slate-100 transition-colors"
                      >
                        Chọn vùng
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="px-3.5 py-2 bg-black/30 border-t border-white/5 text-[11px] text-slate-400">
              Gợi ý từ Mapbox & Photon • © OpenStreetMap • Enter: chọn nhanh
            </div>
          </div>
        )}
      </div>

      {/* Floating User Location Permission Prompt Modal */}
      {showGeoPrompt && (
        <div className="absolute top-16 left-3.5 z-30 w-[340px] max-w-[calc(100%-28px)] bg-[#141820]/95 backdrop-blur-xl border border-sky-500/40 rounded-2xl p-3.5 shadow-2xl shadow-sky-950/60 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-400">
              <Locate className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                Khám phá quanh vị trí của bạn?
              </h4>
              <p className="text-[11.5px] text-slate-300 mt-1 leading-relaxed">
                Cho phép Tiny Map lấy vị trí hiện tại để tự động khoanh vùng và dựng mô hình 3D khu phố nơi bạn đang đứng ngay lập tức.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleLocateUser}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/25 flex items-center gap-1.5 transition-all"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang định vị...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5 rotate-45" />
                      <span>Lấy vị trí & Dựng 3D</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowGeoPrompt(false);
                    sessionStorage.setItem('tiny_map_geo_prompt_dismissed', '1');
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 text-xs transition-colors"
                >
                  Để sau
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setShowGeoPrompt(false);
                sessionStorage.setItem('tiny_map_geo_prompt_dismissed', '1');
              }}
              className="text-slate-400 hover:text-slate-200 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top-Right Drawing & Satellite Mode Toolbar */}
      <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1 bg-[#141820]/95 backdrop-blur-md border border-white/10 p-1 rounded-xl shadow-xl">
        <button
          onClick={() => {
            const nextSat = !isSatellite;
            setIsSatellite(nextSat);
            const map = mapRef.current;
            if (map) {
              map.setStyle(
                nextSat
                  ? 'mapbox://styles/mapbox/satellite-streets-v12'
                  : 'mapbox://styles/mapbox/dark-v11'
              );
            }
          }}
          title="Chuyển đổi Chế độ Vệ tinh (Satellite) / Bản đồ tối"
          className={`px-2.5 h-8 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
            isSatellite
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span>{isSatellite ? '🛰️ Vệ tinh' : '🗺️ Bản đồ'}</span>
        </button>
        <button
          onClick={() => {
            setShowDropdown(false);
            setDrawMode(drawMode === 'rect' ? 'none' : 'rect');
          }}
          title="Vẽ khung chữ nhật mới trên bản đồ để dựng 3D"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            drawMode === 'rect'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setShowDropdown(false);
            const map = mapRef.current;
            if (!map) return;
            const c = map.getCenter();
            const dLat = 0.0036;
            const dLon = 0.0046;
            emitSelectionWithMapboxData(
              {
                south: c.lat - dLat,
                north: c.lat + dLat,
                west: c.lng - dLon,
                east: c.lng + dLon,
              },
              'Vùng trung tâm bản đồ',
              false
            );
          }}
          title="Dựng 3D cho khu vực giữa màn hình bản đồ hiện tại"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-all"
        >
          <Pentagon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDrawMode('rect')}
          title="Khoanh lại vùng mới"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-500/20 hover:text-red-300 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Draw Mode Helper Banner */}
      {drawMode === 'rect' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-orange-500/95 text-white text-xs font-medium shadow-xl flex items-center gap-2 animate-pulse">
          <span>Kéo thả chuột trên bản đồ để khoanh vùng dựng 3D</span>
          <button
            onClick={() => setDrawMode('none')}
            className="underline ml-1 opacity-90 hover:opacity-100"
          >
            Hủy
          </button>
        </div>
      )}

      {/* Status Toast / Geo Error Message */}
      {geoStatusMsg && (
        <div
          className={`absolute bottom-12 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 ${
            geoStatusMsg.isError
              ? 'bg-rose-500/95 text-white shadow-rose-950/50'
              : 'bg-sky-500/95 text-white shadow-sky-950/50'
          }`}
        >
          {isLocating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{geoStatusMsg.text}</span>
        </div>
      )}

      {/* Right-Edge Map Controls (+ / - / Locate / Center) */}
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 flex flex-col bg-[#141820]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl overflow-hidden divide-y divide-white/10">
        <button
          onClick={handleLocateUser}
          disabled={isLocating}
          className="w-8 h-9 flex items-center justify-center text-sky-400 hover:bg-sky-500/20 hover:text-sky-300 transition-colors group"
          title="Định vị vị trí hiện tại của tôi (GPS)"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          ) : (
            <Locate className="w-4 h-4 text-sky-400 group-hover:scale-115 transition-transform" />
          )}
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-9 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          title="Phóng to bản đồ"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-9 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          title="Thu nhỏ bản đồ"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            const cLat = (bbox.south + bbox.north) / 2;
            const cLon = (bbox.west + bbox.east) / 2;
            mapRef.current?.flyTo({ center: [cLon, cLat], zoom: 15.8 });
          }}
          className="w-8 h-9 flex items-center justify-center text-emerald-400 hover:bg-white/10 transition-colors"
          title="Căn giữa vùng đã chọn"
        >
          <Navigation className="w-3.5 h-3.5 rotate-45" />
        </button>
      </div>

      {/* Bottom-Left Scale & Tip */}
      <div className="absolute bottom-3 left-3.5 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-2 py-0.5 bg-[#141820]/85 border-x border-b border-slate-400/60 text-[10px] text-slate-300 font-mono">
          100 m
        </div>
        <span className="text-[11px] text-slate-400 bg-[#141820]/80 px-2 py-0.5 rounded">
          Mẹo: Bấm nút GPS 📍 để dựng 3D quanh vị trí của bạn
        </span>
      </div>
    </div>
  );
};
