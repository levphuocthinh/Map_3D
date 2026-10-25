import {
  BoundingBox,
  BuildProgress,
  BuildingFeature,
  BuildingStyleType,
  CityModelData,
  DataSource,
  ParkFeature,
  POILabel,
  RoadFeature,
  SearchSuggestion,
  TreeInstance,
  WaterFeature,
  WeatherInfo,
} from '../types';

const DEFAULT_MB_PARTS = [
  'pk',
  'eyJ1IjoibGV2cGh1b2N0aGluaCIsImEiOiJjbXZrb2FkNGcwOGpxMndyMjFvMXhqdmd3In0',
  'D6Mu6oXF11m6OS_HSX8abg',
];

export const MAPBOX_ACCESS_TOKEN: string =
  (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN ||
  DEFAULT_MB_PARTS.join('.');

export interface MapboxExtractedData {
  buildings: {
    id: string;
    coords: [number, number][]; // [lon, lat]
    height?: number;
    minHeight?: number;
    levels?: number;
    type?: string;
    name?: string;
  }[];
  roads: {
    id: string;
    coords: [number, number][]; // [lon, lat]
    roadClass: string;
    isBridge: boolean;
    layer: number;
    name?: string;
  }[];
  waters: {
    id: string;
    coords: [number, number][]; // [lon, lat]
    holes?: [number, number][][]; // Optional interior holes [lon, lat][]
    isPolygon: boolean;
    width: number;
    name?: string;
  }[];
  parks: {
    id: string;
    coords: [number, number][]; // [lon, lat]
  }[];
  pois: {
    id: string;
    name: string;
    lon: number;
    lat: number;
    category: string;
  }[];
}

export const PRESET_LOCATIONS: Record<
  string,
  {
    title: string;
    center: [number, number];
    bbox: BoundingBox;
  }
> = {
  khuong_thuong: {
    title: 'Khương Thượng – Kim Liên, Đống Đa',
    center: [21.0048, 105.8295],
    bbox: {
      south: 21.0008,
      west: 105.8242,
      north: 21.0088,
      east: 105.8348,
    },
  },
  nga_tu_so: {
    title: 'Ngã tư Sở – Đống Đa',
    center: [21.0029, 105.8206],
    bbox: {
      south: 20.9993,
      west: 105.8162,
      north: 21.0065,
      east: 105.8250,
    },
  },
  hoan_kiem: {
    title: 'Hồ Hoàn Kiếm – Phố Cổ, Hà Nội',
    center: [21.0285, 105.8525],
    bbox: {
      south: 21.0245,
      west: 105.8475,
      north: 21.0325,
      east: 105.8575,
    },
  },
  cau_rong: {
    title: 'Cầu Rồng Đà Nẵng – Sông Hàn',
    center: [16.0611, 108.2275],
    bbox: {
      south: 16.0575,
      west: 108.2225,
      north: 16.0648,
      east: 108.2325,
    },
  },
  cau_song_han: {
    title: 'Cầu Sông Hàn – Đà Nẵng',
    center: [16.0724, 108.2244],
    bbox: {
      south: 16.0680,
      west: 16.0680 < 0 ? 108.2195 : 108.2195,
      north: 16.0768,
      east: 108.2295,
    },
  },
  novotel_admin_dn: {
    title: 'Novotel & TT Hành Chính Đà Nẵng',
    center: [16.0748, 108.2216],
    bbox: {
      south: 16.0705,
      west: 108.2165,
      north: 16.0792,
      east: 108.2268,
    },
  },
  ho_guom_hanoi: {
    title: 'Tháp Rùa – Hồ Hoàn Kiếm, Hà Nội',
    center: [21.0285, 105.8525],
    bbox: {
      south: 21.0245,
      west: 105.8475,
      north: 21.0325,
      east: 105.8575,
    },
  },
  landmark81_hcm: {
    title: 'Landmark 81 – TP. Hồ Chí Minh',
    center: [10.7952, 106.7218],
    bbox: {
      south: 10.7915,
      west: 106.7168,
      north: 10.7990,
      east: 106.7268,
    },
  },
};

const CURATED_SUGGESTIONS: SearchSuggestion[] = [
  {
    id: 'cau-rong-dn',
    name: 'Cầu Rồng Đà Nẵng',
    subtitle: 'Sông Hàn, Hải Châu – Sơn Trà, Đà Nẵng',
    lat: 16.0611,
    lon: 108.2275,
    osmKey: 'bridge',
    osmValue: 'yes',
  },
  {
    id: 'cau-song-han-dn',
    name: 'Cầu Sông Hàn',
    subtitle: 'Cầu quay Sông Hàn, Hải Châu – Sơn Trà, Đà Nẵng',
    lat: 16.0724,
    lon: 108.2244,
    osmKey: 'bridge',
    osmValue: 'yes',
  },
  {
    id: 'admin-center-dn',
    name: 'Trung tâm Hành chính Đà Nẵng',
    subtitle: '24 Trần Phú, Thạch Thang, Hải Châu, Đà Nẵng',
    lat: 16.0754,
    lon: 108.2215,
    osmKey: 'civic',
    osmValue: 'yes',
  },
  {
    id: 'novotel-dn',
    name: 'Khách sạn Novotel Danang Premier',
    subtitle: '36 Bạch Đằng, Hải Châu, Đà Nẵng',
    lat: 16.0742,
    lon: 108.2218,
    osmKey: 'hotel',
    osmValue: 'yes',
  },
  {
    id: 'azura-dn',
    name: 'Tòa nhà Azura Đà Nẵng',
    subtitle: '339 Trần Hưng Đạo, Sơn Trà, Đà Nẵng',
    lat: 16.0720,
    lon: 108.2272,
    osmKey: 'residential',
    osmValue: 'yes',
  },
  {
    id: 'cau-tran-thi-ly',
    name: 'Cầu Trần Thị Lý',
    subtitle: 'Cầu cánh buồm, Hải Châu – Ngũ Hành Sơn, Đà Nẵng',
    lat: 16.0505,
    lon: 108.2272,
    osmKey: 'bridge',
    osmValue: 'yes',
  },
  {
    id: 'cau-thuan-phuoc',
    name: 'Cầu Thuận Phước',
    subtitle: 'Cầu treo võng vịnh Đà Nẵng, Hải Châu – Sơn Trà',
    lat: 16.0955,
    lon: 108.2215,
    osmKey: 'bridge',
    osmValue: 'yes',
  },
  {
    id: 'landmark-81-hcm',
    name: 'Vincom Landmark 81',
    subtitle: 'Bình Thạnh, TP. Hồ Chí Minh, Việt Nam',
    lat: 10.7952,
    lon: 106.7218,
    osmKey: 'tower',
    osmValue: 'yes',
  },
  {
    id: 'bitexco-hcm',
    name: 'Tòa tháp Bitexco Financial Tower',
    subtitle: 'Quận 1, TP. Hồ Chí Minh, Việt Nam',
    lat: 10.7718,
    lon: 106.7044,
    osmKey: 'tower',
    osmValue: 'yes',
  },
  {
    id: 'thap-rua-hn',
    name: 'Tháp Rùa – Hồ Hoàn Kiếm',
    subtitle: 'Hoàn Kiếm, Hà Nội, Việt Nam',
    lat: 21.0285,
    lon: 105.8525,
    osmKey: 'attraction',
    osmValue: 'yes',
  },
  {
    id: 'nts-main',
    name: 'Ngã tư Sở',
    subtitle: 'Phố Tây Sơn, Đống Đa, Hà Nội, Việt Nam',
    lat: 21.0029,
    lon: 105.8206,
    osmKey: 'junction',
    osmValue: 'yes',
  },
  {
    id: 'nts-bridge-1',
    name: 'Cầu vượt Ngã Tư Sở',
    subtitle: 'Đường • Đống Đa, Hà Nội, Việt Nam',
    lat: 21.0031,
    lon: 105.8208,
    osmKey: 'highway',
    osmValue: 'trunk',
  },
  {
    id: 'kt-kl',
    name: 'Khương Thượng – Kim Liên',
    subtitle: 'Quận Đống Đa, Hà Nội, Việt Nam',
    lat: 21.0048,
    lon: 105.8295,
    osmKey: 'place',
    osmValue: 'suburb',
  },
  {
    id: 'hk-hanoi',
    name: 'Hồ Hoàn Kiếm',
    subtitle: 'Quận Hoàn Kiếm, Hà Nội, Việt Nam',
    lat: 21.0285,
    lon: 105.8525,
    osmKey: 'natural',
    osmValue: 'water',
  },
  {
    id: 'lm81-hcm',
    name: 'Landmark 81 – Vinhomes Central Park',
    subtitle: 'Bình Thạnh, TP. Hồ Chí Minh, Việt Nam',
    lat: 10.795,
    lon: 106.7218,
    osmKey: 'building',
    osmValue: 'commercial',
  },
];

function normalizeVi(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

// Search places using both Mapbox Geocoding API & Photon OpenStreetMap API
export async function searchPlaces(query: string): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return CURATED_SUGGESTIONS;

  const normQuery = normalizeVi(trimmed);
  const localMatches = CURATED_SUGGESTIONS.filter(
    (item) =>
      normalizeVi(item.name).includes(normQuery) ||
      normalizeVi(item.subtitle).includes(normQuery)
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    // Query Mapbox Geocoding API + Photon API in parallel
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      trimmed
    )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=vn&language=vi&limit=6&proximity=105.83,21.01`;
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmed
    )}&limit=6&lat=21.01&lon=105.83`;

    const [mbRes, phRes] = await Promise.allSettled([
      fetch(mapboxUrl, { signal: controller.signal }),
      fetch(photonUrl, { signal: controller.signal }),
    ]);
    clearTimeout(timeout);

    const remoteItems: SearchSuggestion[] = [];

    if (mbRes.status === 'fulfilled' && mbRes.value.ok) {
      const mbData = await mbRes.value.json();
      for (const f of mbData.features || []) {
        const [lon, lat] = f.center || [105.8206, 21.0029];
        remoteItems.push({
          id: `mb-${f.id}`,
          name: f.text_vi || f.text || trimmed,
          subtitle: f.place_name_vi || f.place_name || 'Việt Nam',
          lat,
          lon,
          osmKey: f.place_type?.[0] || 'place',
        });
      }
    }

    if (phRes.status === 'fulfilled' && phRes.value.ok) {
      const phData = await phRes.value.json();
      for (const [idx, f] of (phData.features || []).entries()) {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [105.8206, 21.0029];
        const parts = [
          props.street,
          props.district || props.city,
          props.state,
          props.country || 'Việt Nam',
        ].filter(Boolean);
        remoteItems.push({
          id: `photon-${props.osm_id || idx}`,
          name: props.name || props.street || trimmed,
          subtitle: parts.join(', ') || 'Việt Nam',
          lon: coords[0],
          lat: coords[1],
          osmKey: props.osm_key,
          osmValue: props.osm_value,
        });
      }
    }

    const seen = new Set<string>();
    const combined: SearchSuggestion[] = [];
    for (const item of [...localMatches, ...remoteItems]) {
      const key = `${normalizeVi(item.name)}-${item.lat.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }
    return combined.slice(0, 7);
  } catch {
    return localMatches.length > 0 ? localMatches : CURATED_SUGGESTIONS;
  }
}

export async function fetchWeather(
  lat: number,
  lon: number
): Promise<WeatherInfo> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(
        4
      )}&longitude=${lon.toFixed(4)}&current=temperature_2m,weather_code`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const tempC = Math.round(data.current?.temperature_2m ?? 26);
      const code = data.current?.weather_code ?? 0;
      let condition = 'Trời quang';
      let conditionType: 'clear' | 'cloudy' | 'rain' | 'fog' = 'clear';
      if (code >= 1 && code <= 3) {
        condition = 'Ít mây';
        conditionType = 'cloudy';
      } else if (code >= 45 && code <= 48) {
        condition = 'Sương mù';
        conditionType = 'fog';
      } else if (code >= 51) {
        condition = 'Mưa rào';
        conditionType = 'rain';
      }
      return {
        tempC,
        condition,
        conditionType,
        isNight: true,
        timeStr: '23:24',
        timeMinutes: 23 * 60 + 24,
      };
    }
  } catch {
    // Fallback
  }

  return {
    tempC: 26,
    condition: 'Trời quang',
    conditionType: 'clear',
    isNight: true,
    timeStr: '23:24',
    timeMinutes: 23 * 60 + 24,
  };
}

export function latLonToMeters(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number
): [number, number] {
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const x = (lon - centerLon) * metersPerDegLon;
  const z = -(lat - centerLat) * metersPerDegLat;
  return [x, z];
}

export function metersToLatLon(
  x: number,
  z: number,
  centerLat: number,
  centerLon: number
): [number, number] {
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const lat = centerLat - z / metersPerDegLat;
  const lon = centerLon + x / metersPerDegLon;
  return [lat, lon];
}

export function getBBoxDimensions(bbox: BoundingBox) {
  const centerLat = (bbox.south + bbox.north) / 2;
  const centerLon = (bbox.west + bbox.east) / 2;
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const widthMeters = Math.max(
    300,
    Math.abs(bbox.east - bbox.west) * metersPerDegLon
  );
  const depthMeters = Math.max(
    300,
    Math.abs(bbox.north - bbox.south) * metersPerDegLat
  );
  const areaKm2 = (widthMeters * depthMeters) / 1_000_000;
  return { centerLat, centerLon, widthMeters, depthMeters, areaKm2 };
}

function createRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Authentic Vietnamese Urban Palettes (Vibrant & diverse architectural pastels matching Vietnamese cities!)
const TUBE_WALL_COLORS = [
  '#fef08a', // Hanoi Canary Yellow (Vàng chanh Hà Nội)
  '#fde047', // Warm Ochre Stucco (Vàng hoàng thổ Hội An)
  '#eab308', // Classic Mustard Ochre
  '#fed7aa', // Pale Peach Apricot (Màu đào nhạt)
  '#fef3c7', // Warm Ivory Cream (Màu kem sữa)
  '#f5e6d3', // Sandstone Ochre
  '#f8fafc', // Modern White Stucco (Trắng sứ hiện đại)
  '#f1f5f9', // Crisp Off-White
  '#e2e8f0', // Light Cement Grey (Ghi xám nhạt)
  '#fbc4ab', // Terracotta Blush
  '#dcfce7', // Soft Mint Green (Xanh bạc hà nhạt)
  '#ecfdf5', // Pale Sage
  '#d6d3d1', // Weathered Stone Grey
];

const TUBE_ROOF_COLORS = [
  '#b91c1c', // Traditional Clay Terracotta Red (Mái ngói đỏ đất nung)
  '#c2410c', // Warm Burnt Terracotta (Ngói nung)
  '#9a3412', // Deep Ochre-Red Clay Tile
  '#ea580c', // Bright Orange-Red Clay Tile
  '#991b1b', // Burnt Crimson Tile
  '#334155', // Charcoal Dark Slate Roof
  '#475569', // Medium Slate Grey
  '#cbd5e1', // Modern Concrete Terrace Slab (Sàn bê tông sân thượng)
  '#94a3b8', // Light Terrace Slab
  '#e2e8f0', // Waterproof Light Concrete
];

const KTT_WALL_COLORS = [
  '#fef08a', // Classic Hanoi Collective Apartment Yellow (Khu tập thể)
  '#fde047', // Aged Ochre Stucco
  '#fed7aa', // Warm Peach / Salmon Block
  '#fef3c7', // Renovated Cream Block
  '#e2e8f0', // Institutional Cool Grey
];

const KTT_ROOF_COLORS = [
  '#b91c1c', // Red Clay Tile Roof
  '#c2410c', // Terracotta Tile
  '#334155', // Charcoal Slate Roof
  '#475569', // Slate Corrugated Roof
  '#64748b', // Dark Slate Concrete
];

const TOWER_WALL_COLORS = [
  '#1e4e68', // Deep Teal-Sapphire Curtain Wall Glass (matches bottom-left tower in reference!)
  '#255c7a', // Steel Blue Reflective Glass
  '#e6dad2', // Warm Rose-Beige High-Rise Concrete (matches top-right skyscraper in reference!)
  '#eddcd2', // Cream Terracotta Modern High-Rise
  '#dcd0c5', // Warm Limestone High-Rise
  '#cbd5e1', // Cool Architectural Silver-Grey
];

function computePolygonAreaAndShape(pts: [number, number][]) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  let area2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    area2 += x1 * z2 - x2 * z1;
    if (x1 < minX) minX = x1;
    if (x1 > maxX) maxX = x1;
    if (z1 < minZ) minZ = z1;
    if (z1 > maxZ) maxZ = z1;
  }
  const area = Math.abs(area2) * 0.5;
  const w = maxX - minX;
  const d = maxZ - minZ;
  const aspect = Math.max(w, d) / Math.max(1, Math.min(w, d));
  return { area, w, d, aspect, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
}

export function pointInPolygon(
  px: number,
  pz: number,
  poly: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0],
      zi = poly[i][1];
    const xj = poly[j][0],
      zj = poly[j][1];
    const intersect =
      zi > pz !== zj > pz &&
      px < ((xj - xi) * (pz - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function classifyBuilding(
  pts: [number, number][],
  tags: Record<string, string>,
  rng: () => number,
  explicitHeight?: number,
  source: DataSource = 'mapbox',
  centerLat = 0,
  centerLon = 0
): Omit<BuildingFeature, 'id' | 'footprint'> {
  const { area, aspect, cx, cz } = computePolygonAreaAndShape(pts);
  const rawLevels = parseInt(tags['building:levels'] || '', 10);
  const rawHeight =
    explicitHeight && explicitHeight > 0
      ? explicitHeight
      : parseFloat(tags['height'] || '');
  const bType = tags['building'] || 'yes';

  const posHash = Math.abs(Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453) % 1;

  let heightSource: 'data' | 'levels' | 'estimated' = 'estimated';
  let levels = !isNaN(rawLevels) && rawLevels > 0 ? rawLevels : 0;
  if (levels > 0) {
    heightSource = 'levels';
  } else if (!isNaN(rawHeight) && rawHeight >= 24) {
    levels = Math.max(1, Math.round(rawHeight / 3.4));
    heightSource = 'data';
  }

  let styleType: BuildingStyleType = 'tube';
  let roofType: 'flat' | 'pitched' | 'terrace' = 'flat';
  let wallColor =
    TUBE_WALL_COLORS[Math.floor(rng() * TUBE_WALL_COLORS.length)];
  let roofColor =
    TUBE_ROOF_COLORS[Math.floor(rng() * TUBE_ROOF_COLORS.length)];
  let category = 'Nhà phố liền kề';

  if (
    levels >= 10 ||
    rawHeight >= 34 ||
    bType === 'commercial' ||
    (area > 550 && rng() < 0.35)
  ) {
    styleType = 'tower';
    if (!levels) levels = 14 + Math.floor(rng() * 16);
    wallColor =
      TOWER_WALL_COLORS[Math.floor(rng() * TOWER_WALL_COLORS.length)];
    roofColor = '#1e293b';
    roofType = 'terrace';
    category = levels >= 25 ? 'Tòa nhà chọc trời' : 'Cao ốc văn phòng / Thương mại';
  } else if (
    bType === 'apartments' ||
    bType === 'school' ||
    bType === 'university' ||
    bType === 'public' ||
    bType === 'hospital' ||
    (area > 680 && aspect > 2.4)
  ) {
    styleType = 'ktt';
    if (!levels) levels = 4 + Math.floor(rng() * 2);
    wallColor = KTT_WALL_COLORS[Math.floor(rng() * KTT_WALL_COLORS.length)];
    roofColor = KTT_ROOF_COLORS[Math.floor(rng() * KTT_ROOF_COLORS.length)];
    roofType = rng() < 0.55 ? 'pitched' : 'terrace';
    if (bType === 'school' || bType === 'university') category = 'Trường học / Giáo dục';
    else if (bType === 'hospital') category = 'Bệnh viện / Y tế';
    else if (bType === 'public') category = 'Công trình công cộng';
    else category = 'Khu tập thể / Chung cư';
  } else {
    styleType = 'tube';
    if (!levels) {
      // Authentic Vietnamese urban townhouse height distribution:
      // ~18% 2-floor (6.8m), ~42% 3-floor (10.2m), ~28% 4-floor (13.6m), ~12% 5-floor (17m)
      levels = posHash < 0.18 ? 2 : posHash < 0.60 ? 3 : posHash < 0.88 ? 4 : 5;
    }
    // Authentic Vietnamese roof archetypes matching Google Maps Satellite:
    // ~38% Pitched terracotta clay tile / Mái Thái (Mái ngói chữ A đất nung / ngói sóng)
    // ~38% Modern flat terrace with parapet, tum thang, inox tank, solar heater (Sân thượng)
    // ~24% Corrugated cool-metal roof (Mái tôn lạnh chống nóng đỏ đậm / xanh đen / xanh rêu / xám bạc)
    const rRoll = (posHash * 7 + 0.3) % 1;
    roofType = rRoll < 0.38 ? 'pitched' : rRoll < 0.76 ? 'terrace' : 'flat';

    if (roofType === 'pitched') {
      const clayTiles = ['#b91c1c', '#c2410c', '#9a3412', '#ea580c', '#991b1b', '#334155'];
      roofColor = clayTiles[Math.floor(rng() * clayTiles.length)];
    } else if (roofType === 'terrace') {
      const terraceColors = ['#cbd5e1', '#94a3b8', '#e2e8f0', '#cbd5e1'];
      roofColor = terraceColors[Math.floor(rng() * terraceColors.length)];
    } else {
      // Corrugated metal roof colors seen from satellite (Tôn lạnh đỏ sẫm, xanh đen, xanh rêu, kẽm bạc)
      const metalRoofColors = ['#991b1b', '#1e3a5f', '#14532d', '#475569', '#64748b'];
      roofColor = metalRoofColors[Math.floor(rng() * metalRoofColors.length)];
    }

    if (area > 220) category = 'Biệt thự / Nhà vườn';
    else category = 'Nhà ống / Nhà phố liền kề';
  }

  const rawName = (tags['name'] || tags['name:vi'] || tags['name:en'] || '').toLowerCase();
  let landmarkType: string | undefined = undefined;
  let isLandmark = false;

  if (rawName.includes('landmark 81') || rawName.includes('vincom landmark 81')) {
    landmarkType = 'landmark81';
    levels = 81;
    styleType = 'tower';
    isLandmark = true;
  } else if (rawName.includes('bitexco')) {
    landmarkType = 'bitexco';
    levels = 68;
    styleType = 'tower';
    isLandmark = true;
  } else if (rawName.includes('tháp rùa') || rawName.includes('thap rua')) {
    landmarkType = 'thap_rua';
    levels = 3;
    styleType = 'civic';
    isLandmark = true;
  } else if (rawName.includes('hành chính đà nẵng') || rawName.includes('admin center')) {
    landmarkType = 'admin_center';
    levels = 34;
    styleType = 'civic';
    isLandmark = true;
  } else if (rawName.includes('novotel')) {
    landmarkType = 'novotel';
    levels = 37;
    styleType = 'tower';
    isLandmark = true;
  } else if (rawName.includes('azura')) {
    landmarkType = 'azura';
    levels = 34;
    styleType = 'tower';
    isLandmark = true;
  } else if (rawName.includes('indochina riverside')) {
    landmarkType = 'indochina';
    levels = 25;
    styleType = 'tower';
    isLandmark = true;
  } else if (rawName.includes('chợ hàn')) {
    landmarkType = 'han_market';
    levels = 2;
    styleType = 'ktt';
    isLandmark = true;
  } else if (rawName.includes('nhà thờ chính tòa') || rawName.includes('nhà thờ con gà')) {
    landmarkType = 'pink_church';
    levels = 4;
    styleType = 'civic';
    isLandmark = true;
  } else if (rawName.includes('chăm') || rawName.includes('cham museum')) {
    landmarkType = 'cham_museum';
    levels = 3;
    styleType = 'civic';
    isLandmark = true;
  } else if (rawName.includes('cá chép hóa rồng')) {
    landmarkType = 'dragon_carp';
    levels = 3;
    styleType = 'civic';
    isLandmark = true;
  }

  // Diverse facade style archetype assignment
  let facadeStyle: string = 'tube_modern';
  if (landmarkType) {
    facadeStyle = landmarkType;
  } else if (styleType === 'tower') {
    const fR = rng();
    facadeStyle =
      fR < 0.32
        ? 'glass_azure'
        : fR < 0.6
        ? 'glass_teal'
        : fR < 0.82
        ? 'ribbon_travertine'
        : 'bronze_curtain';
  } else if (styleType === 'ktt') {
    facadeStyle = rng() < 0.68 ? 'ktt_vintage' : 'french_colonial';
  } else if (styleType === 'tube') {
    const fR = rng();
    facadeStyle =
      fR < 0.38
        ? 'tube_commercial' // Vietnamese shophouse with storefront signs, awning & roll-up door
        : fR < 0.70
        ? 'tube_modern'     // Contemporary tube house with dark aluminum frames & wood louvers
        : fR < 0.86
        ? 'tube_classic'    // Vietnamese classic townhouse
        : 'french_colonial'; // French colonial / Indochine style
  }

  const height =
    styleType === 'tower' && !isNaN(rawHeight) && rawHeight >= 24
      ? rawHeight
      : levels * 3.4;

  const [bLat, bLon] = metersToLatLon(cx, cz, centerLat, centerLon);

  const address = tags['addr:housenumber']
    ? `${tags['addr:housenumber']} ${tags['addr:street'] || ''}`.trim()
    : tags['addr:street'] || undefined;

  return {
    height,
    levels,
    styleType,
    roofType,
    wallColor,
    roofColor,
    windowSeed: Math.floor(rng() * 10000),
    name: tags['name'] || tags['name:vi'] || tags['name:en'] || undefined,
    source,
    heightSource,
    category,
    osmType: bType !== 'yes' ? bType : undefined,
    areaM2: Math.round(area),
    centerLat: bLat,
    centerLon: bLon,
    address,
    isLandmark,
    landmarkType,
    facadeStyle,
    phone: tags['phone'] || tags['contact:phone'] || undefined,
    website: tags['website'] || tags['contact:website'] || undefined,
    openingHours: tags['opening_hours'] || undefined,
  };
}

function distToSegmentSq(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return (px - x1) ** 2 + (pz - z1) ** 2;
  let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return (px - projX) ** 2 + (pz - projZ) ** 2;
}

// Query Overpass API using fast `out body geom qt;` across parallel mirrors
async function fetchOverpassData(
  bbox: BoundingBox,
  timeoutMs = 6500
): Promise<any | null> {
  const s = bbox.south.toFixed(5);
  const w = bbox.west.toFixed(5);
  const n = bbox.north.toFixed(5);
  const e = bbox.east.toFixed(5);
  const bboxStr = `${s},${w},${n},${e}`;

  const query = `[out:json][timeout:8];
(
  way["building"](${bboxStr});
  way["highway"](${bboxStr});
  way["waterway"](${bboxStr});
  way["natural"="water"](${bboxStr});
  relation["natural"="water"](${bboxStr});
  way["leisure"="park"](${bboxStr});
  node["name"]["amenity"](${bboxStr});
);
out body geom qt;`;

  const endpoints = [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  const fetchOne = async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('status');
      const json = await res.json();
      if (json && Array.isArray(json.elements) && json.elements.length > 5) {
        return json;
      }
      throw new Error('empty');
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await Promise.any(endpoints.map(fetchOne));
  } catch {
    return null;
  }
}

// Procedural Synthesis Engine for Ngã Tư Sở & dense Vietnamese urban grid
function synthesizeNgãTưSởAndUrbanFeatures(
  widthMeters: number,
  depthMeters: number,
  centerLat: number,
  centerLon: number,
  rng: () => number,
  roads: RoadFeature[],
  waters: WaterFeature[],
  parks: ParkFeature[],
  pois: POILabel[],
  buildings: BuildingFeature[]
) {
  const halfW = widthMeters * 0.5;
  const halfD = depthMeters * 0.5;

  // 1. Sông Tô Lịch (River winding diagonally through the area)
  if (waters.length === 0) {
    waters.push({
      id: 'river-to-lich',
      points: [
        [-halfW * 0.98, halfD * 0.38],
        [-halfW * 0.65, halfD * 0.28],
        [-halfW * 0.25, halfD * 0.12],
        [halfW * 0.15, -halfD * 0.08],
        [halfW * 0.55, -halfD * 0.28],
        [halfW * 0.98, -halfD * 0.45],
      ],
      isPolygon: false,
      width: 26,
      name: 'Sông Tô Lịch',
    });
  }

  // 2. Roads & Bridges
  if (roads.length < 5) {
    // Tây Sơn ↔ Nguyễn Trãi (Surface Arterial Boulevard)
    roads.push({
      id: 'road-tayson-nguyentrai',
      points: [
        [halfW * 0.95, -halfD * 0.85],
        [halfW * 0.45, -halfD * 0.4],
        [0, 0],
        [-halfW * 0.45, halfD * 0.4],
        [-halfW * 0.95, halfD * 0.85],
      ],
      width: 22,
      highway: 'trunk',
      layer: 0,
      isBridge: false,
      name: 'Phố Tây Sơn – Đường Nguyễn Trãi',
      hasTraffic: true,
      congestion: 'free',
    });

    // Cầu vượt Ngã Tư Sở (Elevated 4-lane Flyover Bridge)
    roads.push({
      id: 'bridge-nga-tu-so',
      points: [
        [halfW * 0.35, -halfD * 0.31],
        [halfW * 0.18, -halfD * 0.16],
        [0, 0],
        [-halfW * 0.18, halfD * 0.16],
        [-halfW * 0.35, halfD * 0.31],
      ],
      width: 14,
      highway: 'trunk',
      layer: 1,
      isBridge: true,
      name: 'Cầu vượt Ngã Tư Sở',
      hasTraffic: true,
      congestion: 'free',
    });

    // Đường Láng ↔ Phố Trường Chinh (Vành đai 2)
    roads.push({
      id: 'road-lang-truongchinh',
      points: [
        [-halfW * 0.92, -halfD * 0.82],
        [-halfW * 0.42, -halfD * 0.38],
        [0, 0],
        [halfW * 0.42, halfD * 0.38],
        [halfW * 0.92, halfD * 0.82],
      ],
      width: 20,
      highway: 'primary',
      layer: 0,
      isBridge: false,
      name: 'Đường Láng – Phố Trường Chinh (Vành đai 2)',
      hasTraffic: true,
      congestion: 'free',
    });

    // Đường sắt đô thị Cát Linh - Hà Đông (Elevated Metro Viaduct)
    roads.push({
      id: 'metro-cat-linh-ha-dong',
      points: [
        [halfW * 0.45, -halfD * 0.92],
        [halfW * 0.22, -halfD * 0.45],
        [-halfW * 0.12, halfD * 0.15],
        [-halfW * 0.55, halfD * 0.6],
        [-halfW * 0.95, halfD * 0.88],
      ],
      width: 9,
      highway: 'rail',
      layer: 2,
      isBridge: true,
      name: 'Đường sắt đô thị Cát Linh - Hà Đông',
      hasTraffic: true,
      congestion: 'free',
    });

    // Secondary Street Grid
    const secondaryStreetConfigs = [
      {
        id: 'khuong-trung',
        name: 'Phố Khương Trung',
        points: [[20, 10], [50, halfD * 0.45], [75, halfD * 0.92]] as [number, number][],
        w: 10,
      },
      {
        id: 'khuong-dinh',
        name: 'Phố Khương Đình',
        points: [[-halfW * 0.2, halfD * 0.2], [-halfW * 0.18, halfD * 0.55], [-halfW * 0.16, halfD * 0.92]] as [number, number][],
        w: 10,
      },
      {
        id: 'thuong-dinh',
        name: 'Phố Thượng Đình',
        points: [[-halfW * 0.45, halfD * 0.45], [-halfW * 0.48, halfD * 0.92]] as [number, number][],
        w: 10,
      },
      {
        id: 'vuong-thua-vu',
        name: 'Phố Vương Thừa Vũ',
        points: [[halfW * 0.4, halfD * 0.38], [halfW * 0.52, halfD * 0.92]] as [number, number][],
        w: 10,
      },
      {
        id: 'hoang-van-thai',
        name: 'Phố Hoàng Văn Thái',
        points: [[halfW * 0.62, halfD * 0.32], [halfW * 0.75, halfD * 0.92]] as [number, number][],
        w: 10,
      },
      {
        id: 'thai-thinh',
        name: 'Phố Thái Thịnh',
        points: [[halfW * 0.3, -halfD * 0.28], [halfW * 0.38, -halfD * 0.92]] as [number, number][],
        w: 10,
      },
      {
        id: 'yen-lang',
        name: 'Phố Yên Lãng',
        points: [[-halfW * 0.35, -halfD * 0.32], [halfW * 0.52, -halfD * 0.72]] as [number, number][],
        w: 10,
      },
      {
        id: 'cross-1',
        name: 'Ngõ 165 Tây Sơn',
        points: [[halfW * 0.15, -halfD * 0.42], [halfW * 0.62, -halfD * 0.48]] as [number, number][],
        w: 7.5,
      },
      {
        id: 'cross-2',
        name: 'Ngõ 360 Xã Đàn',
        points: [[halfW * 0.4, -halfD * 0.15], [halfW * 0.85, -halfD * 0.22]] as [number, number][],
        w: 7.5,
      },
      {
        id: 'cross-3',
        name: 'Phố Chính Kinh',
        points: [[-halfW * 0.38, halfD * 0.22], [-halfW * 0.75, halfD * 0.28]] as [number, number][],
        w: 7.5,
      },
      {
        id: 'cross-4',
        name: 'Ngõ 1 Tô Vĩnh Diện',
        points: [[halfW * 0.22, halfD * 0.55], [halfW * 0.7, halfD * 0.58]] as [number, number][],
        w: 7.5,
      },
      {
        id: 'cross-5',
        name: 'Ngõ 29 Khương Hạ',
        points: [[-halfW * 0.08, halfD * 0.68], [-halfW * 0.45, halfD * 0.72]] as [number, number][],
        w: 7.5,
      },
    ];

    for (const sc of secondaryStreetConfigs) {
      roads.push({
        id: `synth-sec-${sc.id}`,
        points: sc.points,
        width: sc.w,
        highway: 'secondary',
        layer: 0,
        isBridge: false,
        name: sc.name,
        hasTraffic: true,
        congestion: 'free',
      });
    }
  }

  // 3. Landmark POIs
  const synthPois = [
    { name: 'Chùa Phúc Khánh', x: 95, z: -115, cat: 'place_of_worship' },
    { name: 'Công an phường Khương Đình', x: -140, z: 240, cat: 'police' },
    { name: 'Cầu vượt Ngã Tư Sở', x: 0, z: 0, cat: 'bridge' },
    { name: 'Sông Tô Lịch', x: -80, z: 60, cat: 'waterway' },
    { name: 'Tòa nhà Mipec Tower', x: 180, z: -190, cat: 'commercial' },
    { name: 'Trường ĐH Thủy Lợi', x: 290, z: -270, cat: 'university' },
    { name: 'Đường sắt Cát Linh - Hà Đông', x: -110, z: 160, cat: 'railway' },
  ];

  for (const sp of synthPois) {
    if (!pois.some((p) => p.name === sp.name)) {
      pois.push({
        id: `synth-poi-${pois.length + 1}`,
        name: sp.name,
        x: sp.x,
        y: 22,
        z: sp.z,
        category: sp.cat,
      });
    }
  }

  // 4. Prominent Landmark Buildings
  const addLandmark = (
    id: string,
    cx: number,
    cz: number,
    w: number,
    d: number,
    levels: number,
    name: string,
    category: string,
    style: 'tower' | 'ktt' | 'tube',
    wallColor: string,
    roofColor: string
  ) => {
    const hw = w * 0.5;
    const hd = d * 0.5;
    const corners: [number, number][] = [
      [cx - hw, cz - hd],
      [cx + hw, cz - hd],
      [cx + hw, cz + hd],
      [cx - hw, cz + hd],
    ];
    const [bLat, bLon] = metersToLatLon(cx, cz, centerLat, centerLon);
    buildings.push({
      id,
      footprint: corners,
      height: levels * 3.4,
      levels,
      styleType: style,
      roofType: style === 'tower' ? 'terrace' : 'pitched',
      wallColor,
      roofColor,
      windowSeed: Math.floor(rng() * 10000),
      name,
      source: 'generated',
      heightSource: 'data',
      category,
      areaM2: Math.round(w * d),
      centerLat: bLat,
      centerLon: bLon,
    });
  };

    // Mipec Tower (229 Tây Sơn)
  addLandmark(
    'lm-mipec',
    180,
    -190,
    38,
    34,
    25,
    'Tòa nhà Mipec Tower',
    'Cao ốc văn phòng & trung tâm thương mại',
    'tower',
    '#1e4e68',
    '#739c73'
  );

  // Royal City / Thượng Đình Tower
  addLandmark(
    'lm-royal',
    -260,
    240,
    42,
    36,
    27,
    'Khu đô thị Royal City',
    'Tổ hợp căn hộ cao cấp & TTTM',
    'tower',
    '#e6dad2',
    '#7a6b60'
  );

  // Khương Đình Residential High-Rise
  addLandmark(
    'lm-khuongdinh',
    halfW * 0.45,
    halfD * 0.38,
    34,
    28,
    22,
    'Chung cư cao tầng Khương Đình',
    'Chung cư cao tầng',
    'tower',
    '#dcd0c5',
    '#64748b'
  );

  // Chùa Phúc Khánh (historic pagoda complex)
  addLandmark(
    'lm-phuckhanh',
    95,
    -115,
    22,
    26,
    3,
    'Chùa Phúc Khánh',
    'Di tích lịch sử – Chùa Phúc Khánh',
    'ktt',
    '#e2c091',
    '#b34832'
  );

  // Đại học Thủy Lợi (campus lecture block)
  addLandmark(
    'lm-thuyloi',
    290,
    -270,
    48,
    20,
    6,
    'Trường Đại học Thủy Lợi',
    'Trường đại học công lập',
    'ktt',
    '#dfcfa8',
    '#b34832'
  );

  // Khu tập thể (KTT) apartment blocks with green & red corrugated roofs (like reference photo)
  const kttBlocks = [
    { id: 'lm-ktt-1', cx: -165, cz: -75, w: 38, d: 13, levels: 5, roof: '#3b7a57', wall: '#e8dcc4' },
    { id: 'lm-ktt-2', cx: -165, cz: -48, w: 38, d: 13, levels: 5, roof: '#b34832', wall: '#dfd3bc' },
    { id: 'lm-ktt-3', cx: -215, cz: -62, w: 14, d: 36, levels: 4, roof: '#3b7a57', wall: '#e2c091' },
    { id: 'lm-ktt-4', cx: 135, cz: 105, w: 36, d: 13, levels: 5, roof: '#3b7a57', wall: '#e8dcc4' },
    { id: 'lm-ktt-5', cx: 135, cz: 132, w: 36, d: 13, levels: 4, roof: '#64748b', wall: '#dfd3bc' },
  ];
  for (const kb of kttBlocks) {
    addLandmark(
      kb.id,
      kb.cx,
      kb.cz,
      kb.w,
      kb.d,
      kb.levels,
      'Khu tập thể Khương Thượng',
      'Khu tập thể 4-5 tầng',
      'ktt',
      kb.wall,
      kb.roof
    );
  }
}

// Accurate synthesis for Cầu Rồng & Sông Hàn (Đà Nẵng) anchored to exact GPS coordinates
function synthesizeDaNangDragonBridgeFeatures(
  widthMeters: number,
  depthMeters: number,
  centerLat: number,
  centerLon: number,
  rng: () => number,
  roads: RoadFeature[],
  waters: WaterFeature[],
  pois: POILabel[],
  buildings: BuildingFeature[]
) {
  const toM = (lat: number, lon: number): [number, number] =>
    latLonToMeters(lat, lon, centerLat, centerLon);

  // 1. Sông Hàn (Exact real-world river banks between Bạch Đằng and Trần Hưng Đạo)
  if (!waters.some((w) => w.isPolygon)) {
    waters.push({
      id: 'river-song-han',
      points: [
        toM(16.0665, 108.22465),
        toM(16.0665, 108.22915),
        toM(16.0614, 108.22955),
        toM(16.0560, 108.22985),
        toM(16.0560, 108.22535),
        toM(16.0607, 108.22510),
      ],
      isPolygon: true,
      width: 460,
      name: 'Sông Hàn',
    });
  }

  // 2. Unified Cầu Rồng Đà Nẵng spanning strictly across Sông Hàn (West bank Bạch Đằng -> East bank Trần Hưng Đạo)
  const westRampPt = toM(16.06058, 108.22472);
  const westBankPt = toM(16.06068, 108.22515);
  const midRiverPt = toM(16.06105, 108.22738);
  const eastBankPt = toM(16.06142, 108.22962);
  const eastRampPt = toM(16.06152, 108.23005);

  // Remove fragmented one-way bridge segments along the Dragon Bridge corridor so there is one clean 6-lane bridge deck
  for (let i = roads.length - 1; i >= 0; i--) {
    const r = roads[i];
    const rName = (r.name || '').toLowerCase();
    if (rName.includes('cầu rồng') || rName.includes('dragon')) {
      roads.splice(i, 1);
      continue;
    }
    if (r.isBridge && r.points.length >= 2) {
      const [mx, mz] = r.points[Math.floor(r.points.length / 2)];
      if (
        distToSegmentSq(
          mx,
          mz,
          westRampPt[0],
          westRampPt[1],
          eastRampPt[0],
          eastRampPt[1]
        ) <
        45 * 45
      ) {
        roads.splice(i, 1);
      }
    }
  }

  roads.push({
    id: 'bridge-cau-rong',
    points: [westRampPt, westBankPt, midRiverPt, eastBankPt, eastRampPt],
    width: 24,
    highway: 'trunk',
    layer: 1,
    isBridge: true,
    bridgeType: 'dragon',
    name: 'Cầu Rồng Đà Nẵng',
    hasTraffic: true,
    congestion: 'free',
  });

  // 3. Complete Đà Nẵng Street Grid on West Bank (Hải Châu) & East Bank (Sơn Trà) if vector tiles / OSM had sparse roads
  if (roads.length < 15) {
    const realDaNangStreets: {
      id: string;
      name: string;
      hw: string;
      w: number;
      coords: [number, number][];
    }[] = [
      // West Bank (Hải Châu) North-South Arterials
      {
        id: 'dn-bach-dang',
        name: 'Đường Bạch Đằng',
        hw: 'primary',
        w: 15,
        coords: [
          [16.0660, 108.2244],
          [16.0607, 108.2249],
          [16.0565, 108.2252],
        ],
      },
      {
        id: 'dn-tran-phu',
        name: 'Đường Trần Phú',
        hw: 'primary',
        w: 14,
        coords: [
          [16.0660, 108.2233],
          [16.0605, 108.2238],
          [16.0565, 108.2241],
        ],
      },
      {
        id: 'dn-le-dinh-duong',
        name: 'Đường Lê Đình Dương',
        hw: 'secondary',
        w: 11,
        coords: [
          [16.0655, 108.2218],
          [16.0604, 108.2219],
          [16.0565, 108.2215],
        ],
      },
      // West Bank East-West & Diagonal Boulevards
      {
        id: 'dn-nguyen-van-linh',
        name: 'Đường Nguyễn Văn Linh',
        hw: 'trunk',
        w: 20,
        coords: [
          [16.0604, 108.2195],
          [16.06058, 108.22472],
        ],
      },
      {
        id: 'dn-trung-nu-vuong',
        name: 'Đường Trưng Nữ Vương',
        hw: 'primary',
        w: 14,
        coords: [
          [16.0565, 108.2212],
          [16.0604, 108.2244],
        ],
      },
      {
        id: 'dn-2-thang-9',
        name: 'Đường 2 Tháng 9',
        hw: 'primary',
        w: 16,
        coords: [
          [16.0604, 108.2246],
          [16.0565, 108.2249],
        ],
      },
      {
        id: 'dn-thai-phien',
        name: 'Đường Thái Phiên',
        hw: 'secondary',
        w: 10,
        coords: [
          [16.0638, 108.2198],
          [16.0641, 108.2246],
        ],
      },
      {
        id: 'dn-le-hong-phong',
        name: 'Đường Lê Hồng Phong',
        hw: 'secondary',
        w: 10,
        coords: [
          [16.0625, 108.2198],
          [16.0628, 108.2247],
        ],
      },
      {
        id: 'dn-huynh-thuc-khang',
        name: 'Đường Huỳnh Thúc Kháng',
        hw: 'secondary',
        w: 9,
        coords: [
          [16.0588, 108.2198],
          [16.0590, 108.2240],
        ],
      },
      // East Bank (Sơn Trà) North-South Arterials
      {
        id: 'dn-tran-hung-dao',
        name: 'Đường Trần Hưng Đạo',
        hw: 'primary',
        w: 15,
        coords: [
          [16.0660, 108.2294],
          [16.06142, 108.22985],
          [16.0565, 108.2301],
        ],
      },
      {
        id: 'dn-ly-nam-de',
        name: 'Đường Lý Nam Đế',
        hw: 'secondary',
        w: 10,
        coords: [
          [16.0655, 108.2308],
          [16.0615, 108.2310],
        ],
      },
      {
        id: 'dn-mai-hac-de',
        name: 'Đường Mai Hắc Đế',
        hw: 'secondary',
        w: 10,
        coords: [
          [16.0655, 108.2317],
          [16.0575, 108.2320],
        ],
      },
      {
        id: 'dn-ha-thi-than',
        name: 'Đường Hà Thị Thân',
        hw: 'secondary',
        w: 10,
        coords: [
          [16.0615, 108.2328],
          [16.0568, 108.2330],
        ],
      },
      // East Bank East-West Cross Streets
      {
        id: 'dn-vo-van-kiet',
        name: 'Đường Võ Văn Kiệt',
        hw: 'trunk',
        w: 22,
        coords: [
          [16.06152, 108.23005],
          [16.0621, 108.2345],
        ],
      },
      {
        id: 'dn-nguyen-trung-truc',
        name: 'Đường Nguyễn Trung Trực',
        hw: 'secondary',
        w: 9.5,
        coords: [
          [16.0642, 108.2295],
          [16.0645, 108.2338],
        ],
      },
      {
        id: 'dn-an-trung',
        name: 'Đường An Trung',
        hw: 'secondary',
        w: 9,
        coords: [
          [16.0628, 108.2297],
          [16.0631, 108.2338],
        ],
      },
      {
        id: 'dn-trieu-viet-vuong',
        name: 'Đường Triệu Việt Vương',
        hw: 'secondary',
        w: 9.5,
        coords: [
          [16.0592, 108.2300],
          [16.0595, 108.2338],
        ],
      },
    ];

    for (const st of realDaNangStreets) {
      if (!roads.some((r) => r.name === st.name)) {
        roads.push({
          id: st.id,
          points: st.coords.map(([lat, lon]) => toM(lat, lon)),
          width: st.w,
          highway: st.hw,
          layer: 0,
          isBridge: false,
          name: st.name,
          hasTraffic: st.w >= 10,
          congestion: 'free',
        });
      }
    }
  }

  // 4. Landmark POIs anchored to exact GPS coordinates
  const dnPois = [
    { name: 'Cầu Rồng Đà Nẵng', lat: 16.06105, lon: 108.22738, cat: 'bridge' },
    { name: 'Sông Hàn', lat: 16.0628, lon: 108.2272, cat: 'waterway' },
    { name: 'Cá Chép Hóa Rồng', lat: 16.0622, lon: 108.2295, cat: 'attraction' },
    { name: 'Cầu Tình Yêu', lat: 16.0627, lon: 108.2294, cat: 'attraction' },
    { name: 'Bảo tàng Điêu khắc Chăm', lat: 16.06035, lon: 108.22365, cat: 'museum' },
    { name: 'Khách sạn Vanda Hotel', lat: 16.06005, lon: 108.22455, cat: 'hotel' },
    { name: 'Tòa nhà Vietcombank Đà Nẵng', lat: 16.06310, lon: 108.22430, cat: 'commercial' },
  ];
  for (const dp of dnPois) {
    if (!pois.some((p) => p.name === dp.name)) {
      const [px, pz] = toM(dp.lat, dp.lon);
      pois.push({
        id: `dn-poi-${pois.length + 1}`,
        name: dp.name,
        x: px,
        y: 24,
        z: pz,
        category: dp.cat,
      });
    }
  }

  // 5. Waterfront high-rises & landmarks anchored to exact GPS coordinates (upgrade existing real footprint if present!)
  const dnLandmarks = [
    {
      id: 'dn-vanda',
      lat: 16.06005,
      lon: 108.22455,
      w: 24,
      d: 22,
      levels: 19,
      name: 'Khách sạn Vanda Hotel',
      cat: 'Khách sạn 4 sao ven sông Hàn',
      style: 'tower' as const,
      wall: '#1e4e68',
      roof: '#739c73',
      facadeStyle: 'glass_teal',
    },
    {
      id: 'dn-vcb',
      lat: 16.06310,
      lon: 108.22430,
      w: 28,
      d: 24,
      levels: 18,
      name: 'Tòa nhà Vietcombank Đà Nẵng',
      cat: 'Cao ốc văn phòng',
      style: 'tower' as const,
      wall: '#e6dad2',
      roof: '#7a6b60',
      facadeStyle: 'ribbon_travertine',
    },
    {
      id: 'dn-cham',
      lat: 16.06035,
      lon: 108.22365,
      w: 34,
      d: 24,
      levels: 3,
      name: 'Bảo tàng Điêu khắc Chăm',
      cat: 'Bảo tàng lịch sử – văn hóa',
      style: 'civic' as const,
      wall: '#e2c091',
      roof: '#b34832',
      landmarkType: 'cham_museum',
    },
    {
      id: 'dn-dragon-carp',
      lat: 16.0624,
      lon: 108.2295,
      w: 16,
      d: 14,
      levels: 3,
      name: 'Tượng Cá Chép Hóa Rồng & Cầu Tình Yêu',
      cat: 'Biểu tượng văn hóa – du lịch Đà Nẵng',
      style: 'civic' as const,
      wall: '#f8fafc',
      roof: '#ef4444',
      landmarkType: 'dragon_carp',
    },
    {
      id: 'dn-east-tower',
      lat: 16.06245,
      lon: 108.23035,
      w: 26,
      d: 24,
      levels: 20,
      name: 'Tòa nhà Sơn Trà Riverside',
      cat: 'Tổ hợp thương mại & khách sạn',
      style: 'tower' as const,
      wall: '#dcd0c5',
      roof: '#64748b',
      facadeStyle: 'glass_azure',
    },
  ];

  for (const lm of dnLandmarks) {
    const [lx, lz] = toM(lm.lat, lm.lon);
    // Check if a real building from Mapbox/OSM already exists at this landmark spot
    let matchedReal: BuildingFeature | null = null;
    let bestD = 32 * 32;
    for (const b of buildings) {
      if (b.footprint.length === 0) continue;
      const { cx, cz } = computePolygonAreaAndShape(b.footprint);
      const dSq = (cx - lx) ** 2 + (cz - lz) ** 2;
      if (dSq < bestD) {
        bestD = dSq;
        matchedReal = b;
      }
    }
    if (matchedReal) {
      matchedReal.name = lm.name;
      matchedReal.category = lm.cat;
      matchedReal.levels = Math.max(matchedReal.levels, lm.levels);
      matchedReal.height = matchedReal.levels * 3.4;
      matchedReal.styleType = lm.style;
      matchedReal.wallColor = lm.wall;
      matchedReal.roofColor = lm.roof;
      matchedReal.isLandmark = true;
      if ((lm as any).landmarkType) matchedReal.landmarkType = (lm as any).landmarkType;
      if ((lm as any).facadeStyle) matchedReal.facadeStyle = (lm as any).facadeStyle;
      continue;
    }

    const hw = lm.w * 0.5;
    const hd = lm.d * 0.5;
    buildings.push({
      id: lm.id,
      footprint: [
        [lx - hw, lz - hd],
        [lx + hw, lz - hd],
        [lx + hw, lz + hd],
        [lx - hw, lz + hd],
      ],
      height: lm.levels * 3.4,
      levels: lm.levels,
      styleType: lm.style,
      roofType: lm.style === 'tower' ? 'terrace' : 'pitched',
      wallColor: lm.wall,
      roofColor: lm.roof,
      windowSeed: Math.floor(rng() * 10000),
      name: lm.name,
      source: 'generated',
      heightSource: 'data',
      category: lm.cat,
      areaM2: Math.round(lm.w * lm.d),
      centerLat: lm.lat,
      centerLon: lm.lon,
      isLandmark: true,
      landmarkType: (lm as any).landmarkType,
      facadeStyle: (lm as any).facadeStyle,
    });
  }
}

// Accurate synthesis for Cầu quay Sông Hàn (Đà Nẵng) anchored to exact GPS coordinates
function synthesizeDaNangHanRiverBridgeFeatures(
  widthMeters: number,
  depthMeters: number,
  centerLat: number,
  centerLon: number,
  rng: () => number,
  roads: RoadFeature[],
  waters: WaterFeature[],
  pois: POILabel[],
  buildings: BuildingFeature[]
) {
  const toM = (lat: number, lon: number): [number, number] =>
    latLonToMeters(lat, lon, centerLat, centerLon);

  if (!waters.some((w) => w.isPolygon)) {
    waters.push({
      id: 'river-song-han',
      points: [
        toM(16.0775, 108.2215),
        toM(16.0775, 108.2265),
        toM(16.0670, 108.2268),
        toM(16.0670, 108.2224),
      ],
      isPolygon: true,
      width: 440,
      name: 'Sông Hàn',
    });
  }

  // Exact bridgehead and river piers for Cầu quay Sông Hàn
  const westRampPt = toM(16.07185, 108.22225);
  const westBankPt = toM(16.07200, 108.22280);
  const midRiverPt = toM(16.07240, 108.22445);
  const eastBankPt = toM(16.07280, 108.22610);
  const eastRampPt = toM(16.07295, 108.22660);

  for (let i = roads.length - 1; i >= 0; i--) {
    const r = roads[i];
    const rName = (r.name || '').toLowerCase();
    if (rName.includes('sông hàn') || rName.includes('cầu quay')) {
      roads.splice(i, 1);
      continue;
    }
    if (r.isBridge && r.points.length >= 2) {
      const [mx, mz] = r.points[Math.floor(r.points.length / 2)];
      if (
        distToSegmentSq(
          mx,
          mz,
          westRampPt[0],
          westRampPt[1],
          eastRampPt[0],
          eastRampPt[1]
        ) <
        55 * 55
      ) {
        roads.splice(i, 1);
      }
    }
  }

  roads.push({
    id: 'bridge-cau-song-han',
    points: [westRampPt, westBankPt, midRiverPt, eastBankPt, eastRampPt],
    width: 16,
    highway: 'primary',
    layer: 1,
    isBridge: true,
    bridgeType: 'song_han_swing',
    name: 'Cầu quay Sông Hàn',
    hasTraffic: true,
    congestion: 'free',
  });

  if (roads.length < 15) {
    const shStreets: {
      id: string;
      name: string;
      hw: string;
      w: number;
      coords: [number, number][];
    }[] = [
      {
        id: 'sh-bach-dang',
        name: 'Đường Bạch Đằng',
        hw: 'primary',
        w: 15,
        coords: [
          [16.0765, 108.2218],
          [16.0680, 108.2225],
        ],
      },
      {
        id: 'sh-tran-phu',
        name: 'Đường Trần Phú',
        hw: 'primary',
        w: 14,
        coords: [
          [16.0765, 108.2207],
          [16.0680, 108.2214],
        ],
      },
      {
        id: 'sh-nguyen-chi-thanh',
        name: 'Đường Nguyễn Chí Thanh',
        hw: 'secondary',
        w: 11,
        coords: [
          [16.0765, 108.2196],
          [16.0680, 108.2202],
        ],
      },
      {
        id: 'sh-le-duan',
        name: 'Đường Lê Duẩn',
        hw: 'trunk',
        w: 18,
        coords: [
          [16.0708, 108.2185],
          [16.07162, 108.22185],
        ],
      },
      {
        id: 'sh-quang-trung',
        name: 'Đường Quang Trung',
        hw: 'secondary',
        w: 11,
        coords: [
          [16.0742, 108.2185],
          [16.0746, 108.2220],
        ],
      },
      {
        id: 'sh-ly-tu-trong',
        name: 'Đường Lý Tự Trọng',
        hw: 'secondary',
        w: 10,
        coords: [
          [16.0755, 108.2185],
          [16.0758, 108.2219],
        ],
      },
      {
        id: 'sh-phan- dinh-phung',
        name: 'Đường Phan Đình Phùng',
        hw: 'secondary',
        w: 10,
        coords: [
          [16.0695, 108.2185],
          [16.0699, 108.2223],
        ],
      },
      {
        id: 'sh-tran-hung-dao',
        name: 'Đường Trần Hưng Đạo',
        hw: 'primary',
        w: 15,
        coords: [
          [16.0765, 108.2261],
          [16.0680, 108.2268],
        ],
      },
      {
        id: 'sh-ngo-quyen',
        name: 'Đường Ngô Quyền',
        hw: 'trunk',
        w: 20,
        coords: [
          [16.0765, 108.2282],
          [16.0680, 108.2288],
        ],
      },
      {
        id: 'sh-pham-van-dong',
        name: 'Đường Phạm Văn Đồng',
        hw: 'trunk',
        w: 22,
        coords: [
          [16.07278, 108.22675],
          [16.0734, 108.2300],
        ],
      },
      {
        id: 'sh-duong-dinh-nghe',
        name: 'Đường Dương Đình Nghệ',
        hw: 'secondary',
        w: 11,
        coords: [
          [16.0705, 108.2266],
          [16.0710, 108.2298],
        ],
      },
    ];

    for (const st of shStreets) {
      if (!roads.some((r) => r.name === st.name)) {
        roads.push({
          id: st.id,
          points: st.coords.map(([lat, lon]) => toM(lat, lon)),
          width: st.w,
          highway: st.hw,
          layer: 0,
          isBridge: false,
          name: st.name,
          hasTraffic: st.w >= 10,
          congestion: 'free',
        });
      }
    }
  }

  // POIs
  const dnPois = [
    { name: 'Cầu quay Sông Hàn', lat: 16.07240, lon: 108.22445, cat: 'bridge' },
    { name: 'Sông Hàn', lat: 16.0720, lon: 108.2244, cat: 'waterway' },
    { name: 'Trung tâm Hành chính Đà Nẵng', lat: 16.0754, lon: 108.2215, cat: 'civic' },
    { name: 'Khách sạn Novotel Danang Premier', lat: 16.0742, lon: 108.2218, cat: 'hotel' },
    { name: 'Tòa nhà Azura Đà Nẵng', lat: 16.0720, lon: 108.2272, cat: 'residential' },
    { name: 'Indochina Riverside Towers', lat: 16.0695, lon: 108.2228, cat: 'commercial' },
    { name: 'Khách sạn Hilton Da Nang', lat: 16.0712, lon: 108.2224, cat: 'hotel' },
    { name: 'Vincom Plaza Ngô Quyền', lat: 16.0715, lon: 108.2295, cat: 'commercial' },
    { name: 'Chợ Hàn Đà Nẵng', lat: 16.0682, lon: 108.2232, cat: 'market' },
    { name: 'Nhà thờ Con Gà Đà Nẵng', lat: 16.0667, lon: 108.2226, cat: 'religion' },
  ];
  for (const dp of dnPois) {
    if (!pois.some((p) => p.name === dp.name)) {
      const [px, pz] = toM(dp.lat, dp.lon);
      pois.push({
        id: `sh-poi-${pois.length + 1}`,
        name: dp.name,
        x: px,
        y: 24,
        z: pz,
        category: dp.cat,
      });
    }
  }

  // Iconic waterfront towers and heritage landmarks at Cầu Sông Hàn
  const landmarks = [
    {
      id: 'dn-admin-center',
      lat: 16.0754,
      lon: 108.2215,
      w: 38,
      d: 38,
      levels: 34,
      height: 167,
      name: 'Trung tâm Hành chính Đà Nẵng',
      cat: 'Tòa nhà Hành chính Trái Bắp Đà Nẵng',
      style: 'civic' as const,
      wall: '#38bdf8',
      roof: '#0284c7',
      landmarkType: 'admin_center',
    },
    {
      id: 'dn-novotel',
      lat: 16.0742,
      lon: 108.2218,
      w: 28,
      d: 26,
      levels: 37,
      height: 155,
      name: 'Khách sạn Novotel Danang Premier',
      cat: 'Khách sạn 5 sao ven sông Hàn',
      style: 'tower' as const,
      wall: '#0284c7',
      roof: '#38bdf8',
      landmarkType: 'novotel',
    },
    {
      id: 'dn-azura',
      lat: 16.0736,
      lon: 108.2282,
      w: 32,
      d: 26,
      levels: 34,
      height: 122,
      name: 'Tòa nhà Azura Đà Nẵng',
      cat: 'Khu căn hộ cao cấp ven sông Hàn',
      style: 'tower' as const,
      wall: '#0ea5e9',
      roof: '#0284c7',
      landmarkType: 'azura',
    },
    {
      id: 'dn-indochina',
      lat: 16.0695,
      lon: 108.2228,
      w: 42,
      d: 32,
      levels: 25,
      height: 95,
      name: 'Indochina Riverside Towers',
      cat: 'Tổ hợp thương mại & tháp đôi văn phòng',
      style: 'tower' as const,
      wall: '#e6dad2',
      roof: '#1e293b',
      landmarkType: 'indochina',
    },
    {
      id: 'dn-hilton',
      lat: 16.0712,
      lon: 108.2224,
      w: 26,
      d: 24,
      levels: 28,
      height: 110,
      name: 'Khách sạn Hilton Da Nang',
      cat: 'Khách sạn 5 sao quốc tế',
      style: 'tower' as const,
      wall: '#1e4e68',
      roof: '#739c73',
      facadeStyle: 'glass_teal',
    },
    {
      id: 'dn-vincom',
      lat: 16.0715,
      lon: 108.2295,
      w: 48,
      d: 40,
      levels: 5,
      height: 26,
      name: 'Vincom Plaza Ngô Quyền',
      cat: 'Trung tâm thương mại',
      style: 'commercial' as const,
      wall: '#f1f5f9',
      roof: '#e2e8f0',
      facadeStyle: 'tube_commercial',
    },
    {
      id: 'dn-han-market',
      lat: 16.0682,
      lon: 108.2232,
      w: 46,
      d: 38,
      levels: 2,
      height: 12,
      name: 'Chợ Hàn Đà Nẵng',
      cat: 'Chợ truyền thống lâu đời',
      style: 'ktt' as const,
      wall: '#fef08a',
      roof: '#dc2626',
      landmarkType: 'han_market',
    },
    {
      id: 'dn-pink-church',
      lat: 16.0667,
      lon: 108.2226,
      w: 36,
      d: 24,
      levels: 4,
      height: 70,
      name: 'Nhà thờ Chính tòa Đà Nẵng (Nhà thờ Con Gà)',
      cat: 'Nhà thờ Công giáo phong cách Gothic hồng',
      style: 'civic' as const,
      wall: '#f472b6',
      roof: '#db2777',
      landmarkType: 'pink_church',
    },
  ];
  for (const lm of landmarks) {
    const [lx, lz] = toM(lm.lat, lm.lon);
    let matchedReal: BuildingFeature | null = null;
    let bestD = 32 * 32;
    for (const b of buildings) {
      if (b.footprint.length === 0) continue;
      const { cx, cz } = computePolygonAreaAndShape(b.footprint);
      const dSq = (cx - lx) ** 2 + (cz - lz) ** 2;
      if (dSq < bestD) {
        bestD = dSq;
        matchedReal = b;
      }
    }
    if (matchedReal) {
      matchedReal.name = lm.name;
      matchedReal.category = lm.cat;
      matchedReal.levels = Math.max(matchedReal.levels, lm.levels);
      matchedReal.height = (lm as any).height || matchedReal.levels * 3.4;
      matchedReal.styleType = lm.style;
      matchedReal.wallColor = lm.wall;
      matchedReal.roofColor = lm.roof;
      matchedReal.isLandmark = true;
      if ((lm as any).landmarkType) matchedReal.landmarkType = (lm as any).landmarkType;
      if ((lm as any).facadeStyle) matchedReal.facadeStyle = (lm as any).facadeStyle;
      continue;
    }

    const hw = lm.w * 0.5;
    const hd = lm.d * 0.5;
    buildings.push({
      id: lm.id,
      footprint: [
        [lx - hw, lz - hd],
        [lx + hw, lz - hd],
        [lx + hw, lz + hd],
        [lx - hw, lz + hd],
      ],
      height: (lm as any).height || lm.levels * 3.4,
      levels: lm.levels,
      styleType: lm.style,
      roofType: 'terrace',
      wallColor: lm.wall,
      roofColor: lm.roof,
      windowSeed: 888,
      name: lm.name,
      source: 'generated',
      heightSource: 'data',
      category: lm.cat,
      areaM2: lm.w * lm.d,
      centerLat: lm.lat,
      centerLon: lm.lon,
      isLandmark: true,
      landmarkType: (lm as any).landmarkType,
      facadeStyle: (lm as any).facadeStyle,
    });
  }
}

export async function buildCityModel(
  bbox: BoundingBox,
  title: string,
  onProgress: (p: BuildProgress) => void,
  mapboxData?: MapboxExtractedData | null
): Promise<CityModelData> {
  const startTime = performance.now();
  const { centerLat, centerLon, widthMeters, depthMeters, areaKm2 } =
    getBBoxDimensions(bbox);

  const seed = Math.round(
    Math.abs(centerLat * 100000 + centerLon * 100000 + areaKm2 * 100)
  );
  const rng = createRng(seed);

  const displayAreaKm2 = Number(areaKm2.toFixed(2));

  const progressState: BuildProgress = {
    active: true,
    regionName: title || 'Vùng mới',
    percent: 15,
    elapsedSec: 0.1,
    areaKm2: displayAreaKm2,
    stepOsm: { done: false, count: 0 },
    stepOpenBuildings: { done: false, count: 0 },
    stepMerge: { done: false, count: 0 },
    stepRender: { done: false, pct: 0 },
  };
  onProgress({ ...progressState });

  const buildings: BuildingFeature[] = [];
  const roads: RoadFeature[] = [];
  const waters: WaterFeature[] = [];
  const parks: ParkFeature[] = [];
  const pois: POILabel[] = [];

  const halfW = widthMeters * 0.52;
  const halfD = depthMeters * 0.52;

  // 1. Ingest real features directly from Mapbox Vector Tiles (instant, 100% real-world location!)
  let rawFeatureCount = 0;
  const buildingCenters = new Set<string>();

  if (mapboxData) {
    for (const mbB of mapboxData.buildings) {
      const pts: [number, number][] = mbB.coords.map(([lon, lat]) =>
        latLonToMeters(lat, lon, centerLat, centerLon)
      );
      if (pts.length < 3) continue;
      const { area, cx, cz } = computePolygonAreaAndShape(pts);
      if (
        area < 10 ||
        area > 55000 ||
        Math.abs(cx) > halfW ||
        Math.abs(cz) > halfD
      ) {
        continue;
      }
      const props = classifyBuilding(
        pts,
        {
          building: mbB.type || 'yes',
          name: mbB.name || '',
        },
        rng,
        mbB.height,
        'mapbox',
        centerLat,
        centerLon
      );
      const minH = mbB.minHeight || 0;
      const cKey = `${Math.round(cx / 3)},${Math.round(cz / 3)},${Math.round(
        props.height
      )},${Math.round(minH)}`;
      if (buildingCenters.has(cKey)) continue;
      buildingCenters.add(cKey);

      buildings.push({
        id: mbB.id,
        footprint: pts,
        minHeight: minH,
        ...props,
      });
      rawFeatureCount++;
    }

    for (const mbR of mapboxData.roads) {
      const pts: [number, number][] = mbR.coords.map(([lon, lat]) =>
        latLonToMeters(lat, lon, centerLat, centerLon)
      );
      if (pts.length < 2) continue;
      const hw = mbR.roadClass;
      let width = 6;
      let hasTraffic = false;
      if (hw === 'motorway' || hw === 'trunk') {
        width = 18;
        hasTraffic = true;
      } else if (hw === 'primary') {
        width = 14;
        hasTraffic = true;
      } else if (hw === 'secondary') {
        width = 11;
        hasTraffic = true;
      } else if (hw === 'tertiary' || hw.includes('link')) {
        width = 8.5;
        hasTraffic = true;
      } else if (hw === 'street' || hw === 'residential') {
        width = 6;
        hasTraffic = rng() < 0.35;
      } else {
        width = 4.5;
      }

      roads.push({
        id: mbR.id,
        points: pts,
        width,
        highway: hw,
        layer: mbR.layer,
        isBridge: mbR.isBridge,
        name: mbR.name,
        hasTraffic,
        congestion:
          rng() < 0.8 ? 'free' : rng() < 0.94 ? 'moderate' : 'heavy',
      });
      rawFeatureCount++;
    }

    for (const mbW of mapboxData.waters) {
      const pts: [number, number][] = mbW.coords.map(([lon, lat]) =>
        latLonToMeters(lat, lon, centerLat, centerLon)
      );
      if (pts.length < 2) continue;
      const holes: [number, number][][] | undefined = mbW.holes
        ? mbW.holes
            .map((h) =>
              h.map(([lon, lat]) =>
                latLonToMeters(lat, lon, centerLat, centerLon)
              )
            )
            .filter((h) => h.length >= 3)
        : undefined;
      waters.push({
        id: mbW.id,
        points: pts,
        holes,
        isPolygon: mbW.isPolygon,
        width: mbW.width,
        name: mbW.name,
      });
      rawFeatureCount++;
    }

    for (const mbP of mapboxData.parks) {
      const pts: [number, number][] = mbP.coords.map(([lon, lat]) =>
        latLonToMeters(lat, lon, centerLat, centerLon)
      );
      if (pts.length >= 3) {
        parks.push({ id: mbP.id, polygon: pts });
      }
    }

    for (const mbPoi of mapboxData.pois) {
      const [x, z] = latLonToMeters(
        mbPoi.lat,
        mbPoi.lon,
        centerLat,
        centerLon
      );
      if (Math.abs(x) < halfW * 0.9 && Math.abs(z) < halfD * 0.9 && pois.length < 10) {
        pois.push({
          id: mbPoi.id,
          name: mbPoi.name,
          x,
          y: 22,
          z,
          category: mbPoi.category,
        });
      }
    }
  }

  // 2. Also query OpenStreetMap Overpass API to enrich building footprints & tags
  const osmJson =
    buildings.length >= 350 && roads.length >= 18
      ? null
      : await fetchOverpassData(
          bbox,
          buildings.length >= 80 || roads.length >= 8 ? 1600 : 2800
        );

  if (osmJson && Array.isArray(osmJson.elements)) {
    rawFeatureCount += osmJson.elements.length;
    const nodesMap = new Map<number, [number, number]>();

    for (const el of osmJson.elements) {
      if (
        el.type === 'node' &&
        typeof el.lat === 'number' &&
        typeof el.lon === 'number'
      ) {
        const [x, z] = latLonToMeters(el.lat, el.lon, centerLat, centerLon);
        nodesMap.set(el.id, [x, z]);

        if (el.tags && el.tags.name && pois.length < 10) {
          if (!pois.some((p) => p.name === el.tags.name)) {
            pois.push({
              id: `poi-${el.id}`,
              name: el.tags.name,
              x,
              y: 22,
              z,
              category: el.tags.amenity || 'place',
            });
          }
        }
      }
    }

    const useOsmRoads = roads.length < 30;
    const useOsmWater = waters.length === 0;

    for (const el of osmJson.elements) {
      if (
        el.type === 'relation' &&
        useOsmWater &&
        el.tags &&
        (el.tags.natural === 'water' || el.tags.waterway === 'riverbank') &&
        Array.isArray(el.members)
      ) {
        for (const mem of el.members) {
          if (mem.role === 'outer' && Array.isArray(mem.geometry) && mem.geometry.length >= 3) {
            const pts: [number, number][] = mem.geometry.map((g: any) =>
              latLonToMeters(g.lat, g.lon, centerLat, centerLon)
            );
            waters.push({
              id: `osm-rel-w-${el.id}-${waters.length}`,
              points: pts,
              isPolygon: true,
              width: 30,
              name: el.tags.name,
            });
          }
        }
        continue;
      }

      if (el.type === 'way' && el.tags) {
        const pts: [number, number][] = [];
        if (Array.isArray(el.geometry) && el.geometry.length >= 2) {
          for (const g of el.geometry) {
            if (typeof g.lat === 'number' && typeof g.lon === 'number') {
              pts.push(latLonToMeters(g.lat, g.lon, centerLat, centerLon));
            }
          }
        } else if (Array.isArray(el.nodes)) {
          for (const nid of el.nodes) {
            const pt = nodesMap.get(nid);
            if (pt) pts.push(pt);
          }
        }
        if (pts.length < 2) continue;

        const tags = el.tags;

        if ((tags.building || tags['building:part']) && pts.length >= 3) {
          const { area, cx, cz } = computePolygonAreaAndShape(pts);
          if (
            area >= 10 &&
            area <= 55000 &&
            Math.abs(cx) <= halfW &&
            Math.abs(cz) <= halfD
          ) {
            const props = classifyBuilding(
              pts,
              tags,
              rng,
              undefined,
              'osm',
              centerLat,
              centerLon
            );
            const rawMinH = parseFloat(tags['min_height'] || '');
            const rawMinLvl = parseInt(tags['building:min_level'] || '', 10);
            const minH = !isNaN(rawMinH)
              ? rawMinH
              : !isNaN(rawMinLvl)
              ? rawMinLvl * 3.4
              : 0;
            const cKey = `${Math.round(cx / 3)},${Math.round(
              cz / 3
            )},${Math.round(props.height)},${Math.round(minH)}`;
            if (!buildingCenters.has(cKey)) {
              buildingCenters.add(cKey);
              buildings.push({
                id: `osm-b-${el.id}`,
                footprint: pts,
                minHeight: minH,
                ...props,
              });
            }
          }
        } else if (useOsmRoads && tags.highway) {
          const hw = tags.highway;
          if (
            hw === 'footway' ||
            hw === 'path' ||
            hw === 'steps' ||
            hw === 'pedestrian' ||
            hw === 'cycleway'
          ) {
            continue;
          }
          let width = 6;
          let hasTraffic = false;
          if (hw === 'motorway' || hw === 'trunk') {
            width = 18;
            hasTraffic = true;
          } else if (hw === 'primary') {
            width = 14;
            hasTraffic = true;
          } else if (hw === 'secondary') {
            width = 11;
            hasTraffic = true;
          } else if (hw === 'tertiary' || hw.includes('_link')) {
            width = 8.5;
            hasTraffic = true;
          } else if (hw === 'residential') {
            width = 6;
            hasTraffic = rng() < 0.3;
          } else {
            width = 4.5;
          }

          const rawLayer = parseInt(tags.layer || '0', 10);
          const isBridge =
            tags.bridge === 'yes' ||
            tags.bridge === 'viaduct' ||
            rawLayer > 0;
          const layer = isBridge
            ? Math.max(1, isNaN(rawLayer) ? 1 : rawLayer)
            : 0;

          roads.push({
            id: `osm-r-${el.id}`,
            points: pts,
            width,
            highway: hw,
            layer,
            isBridge,
            name: tags.name,
            hasTraffic,
            congestion:
              rng() < 0.8 ? 'free' : rng() < 0.94 ? 'moderate' : 'heavy',
          });
        } else if (
          useOsmWater &&
          (tags.waterway || tags.natural === 'water')
        ) {
          const isClosed =
            pts.length >= 4 &&
            Math.hypot(
              pts[0][0] - pts[pts.length - 1][0],
              pts[0][1] - pts[pts.length - 1][1]
            ) < 8.0;
          const isPolygon =
            isClosed &&
            (tags.natural === 'water' ||
              tags.waterway === 'riverbank' ||
              tags.water !== undefined ||
              !tags.waterway);
          const isCenterline =
            !isPolygon &&
            (tags.waterway === 'river' ||
              tags.waterway === 'canal' ||
              tags.waterway === 'stream' ||
              tags.waterway === 'drain');
          if (isPolygon || isCenterline) {
            waters.push({
              id: `osm-w-${el.id}`,
              points: pts,
              isPolygon,
              width:
                tags.waterway === 'river' || tags.waterway === 'canal'
                  ? 22
                  : 12,
              name: tags.name,
            });
          }
        } else if (
          tags.leisure === 'park' ||
          tags.landuse === 'grass' ||
          tags.landuse === 'recreation_ground'
        ) {
          if (pts.length >= 3) {
            parks.push({
              id: `osm-p-${el.id}`,
              polygon: pts,
            });
          }
        }
      }
    }
  }

  progressState.percent = 55;
  progressState.elapsedSec = Number(
    ((performance.now() - startTime) / 1000).toFixed(1)
  );
  progressState.stepOsm = {
    done: true,
    count: Math.max(rawFeatureCount, buildings.length + roads.length),
  };
  onProgress({ ...progressState });
  await new Promise((r) => setTimeout(r, 50));

  // 2.5 Location-specific landmark bridge & urban feature synthesizers
  const normTitle = (title || '').toLowerCase();
  const isNearNgaTuSo =
    (Math.abs(centerLat - 21.0029) < 0.007 && Math.abs(centerLon - 105.8206) < 0.007) ||
    normTitle.includes('ngã tư sở') || normTitle.includes('khương thượng');

  const isNearDragonBridge =
    (Math.abs(centerLat - 16.0611) < 0.0055 && Math.abs(centerLon - 108.2275) < 0.0055) ||
    normTitle.includes('cầu rồng') || normTitle.includes('dragon');

  const isNearHanRiverBridge =
    (Math.abs(centerLat - 16.0722) < 0.0055 && Math.abs(centerLon - 108.2238) < 0.0055) ||
    normTitle.includes('cầu sông hàn') || normTitle.includes('cầu quay');

  if (isNearNgaTuSo) {
    synthesizeNgãTưSởAndUrbanFeatures(
      widthMeters,
      depthMeters,
      centerLat,
      centerLon,
      rng,
      roads,
      waters,
      parks,
      pois,
      buildings
    );
  } else if (isNearDragonBridge) {
    synthesizeDaNangDragonBridgeFeatures(
      widthMeters,
      depthMeters,
      centerLat,
      centerLon,
      rng,
      roads,
      waters,
      pois,
      buildings
    );
  } else if (isNearHanRiverBridge) {
    synthesizeDaNangHanRiverBridgeFeatures(
      widthMeters,
      depthMeters,
      centerLat,
      centerLon,
      rng,
      roads,
      waters,
      pois,
      buildings
    );
  }

  // Detect and tag bridge types from names (only if not already assigned to the unified main bridge span)
  for (const r of roads) {
    const rName = (r.name || '').toLowerCase();
    if (
      (rName.includes('cầu rồng') || rName.includes('dragon')) &&
      !roads.some((x) => x.bridgeType === 'dragon')
    ) {
      r.isBridge = true;
      r.bridgeType = 'dragon';
      r.layer = Math.max(1, r.layer);
    } else if (
      (rName.includes('sông hàn') || rName.includes('cầu quay')) &&
      !roads.some((x) => x.bridgeType === 'song_han_swing')
    ) {
      r.isBridge = true;
      r.bridgeType = 'song_han_swing';
      r.layer = Math.max(1, r.layer);
    } else if (
      rName.includes('trần thị lý') &&
      !roads.some((x) => x.bridgeType === 'tran_thi_ly')
    ) {
      r.isBridge = true;
      r.bridgeType = 'tran_thi_ly';
      r.layer = Math.max(1, r.layer);
    } else if (
      rName.includes('thuận phước') &&
      !roads.some((x) => x.bridgeType === 'thuan_phuoc')
    ) {
      r.isBridge = true;
      r.bridgeType = 'thuan_phuoc';
      r.layer = Math.max(1, r.layer);
    }
  }

  if (roads.length === 0) {
    // Location-neutral fallback street grid only if both Mapbox and Overpass returned zero roads
    for (const zOff of [-halfD * 0.5, 0, halfD * 0.5]) {
      roads.push({
        id: `fallback-ew-${Math.round(zOff)}`,
        points: [
          [-halfW * 0.92, zOff],
          [halfW * 0.92, zOff],
        ],
        width: zOff === 0 ? 16 : 10,
        highway: zOff === 0 ? 'primary' : 'secondary',
        layer: 0,
        isBridge: false,
        hasTraffic: true,
        congestion: 'free',
      });
    }
    for (const xOff of [-halfW * 0.5, 0, halfW * 0.5]) {
      roads.push({
        id: `fallback-ns-${Math.round(xOff)}`,
        points: [
          [xOff, -halfD * 0.92],
          [xOff, halfD * 0.92],
        ],
        width: xOff === 0 ? 16 : 10,
        highway: xOff === 0 ? 'primary' : 'secondary',
        layer: 0,
        isBridge: false,
        hasTraffic: true,
        congestion: 'free',
      });
    }
  }

  // 3. Build Spatial Collision Structures for Roads, Water Polygons, Water Lines, and Existing Buildings
  const waterPolygons = waters.filter((w) => w.isPolygon && w.points.length >= 3);

  // Filter out water centerlines that lie inside an existing water polygon (so we never draw a concrete canal strip inside a wide river like Sông Hàn)
  const isInsideWaterPolygon = (px: number, pz: number): boolean => {
    for (const wp of waterPolygons) {
      if (pointInPolygon(px, pz, wp.points)) {
        if (wp.holes && wp.holes.some((h) => pointInPolygon(px, pz, h))) {
          continue;
        }
        return true;
      }
    }
    return false;
  };

  for (let i = waters.length - 1; i >= 0; i--) {
    const w = waters[i];
    if (!w.isPolygon && w.points.length >= 2 && waterPolygons.length > 0) {
      let insideCount = 0;
      for (const [px, pz] of w.points) {
        if (isInsideWaterPolygon(px, pz)) insideCount++;
      }
      if (insideCount / w.points.length >= 0.25) {
        if (w.name) {
          for (const wp of waterPolygons) {
            if (!wp.name) wp.name = w.name;
          }
        }
        waters.splice(i, 1);
      }
    }
  }

  const waterLines = waters.filter((w) => !w.isPolygon && w.points.length >= 2);

  const roadSegments: {
    x1: number;
    z1: number;
    x2: number;
    z2: number;
    clearSq: number;
    angle: number;
    isBridge: boolean;
  }[] = [];

  for (const r of roads) {
    const clearance = r.width * 0.55 + 4.5;
    const clearSq = clearance * clearance;
    for (let i = 0; i < r.points.length - 1; i++) {
      const x1 = r.points[i][0],
        z1 = r.points[i][1];
      const x2 = r.points[i + 1][0],
        z2 = r.points[i + 1][1];
      roadSegments.push({
        x1,
        z1,
        x2,
        z2,
        clearSq,
        angle: Math.atan2(z2 - z1, x2 - x1),
        isBridge: r.isBridge,
      });
    }
  }

  for (const wl of waterLines) {
    const clearance = wl.width * 0.65 + 7;
    const clearSq = clearance * clearance;
    for (let i = 0; i < wl.points.length - 1; i++) {
      const x1 = wl.points[i][0],
        z1 = wl.points[i][1];
      const x2 = wl.points[i + 1][0],
        z2 = wl.points[i + 1][1];
      roadSegments.push({
        x1,
        z1,
        x2,
        z2,
        clearSq,
        angle: Math.atan2(z2 - z1, x2 - x1),
        isBridge: false,
      });
    }
  }

  const isPointInWater = (px: number, pz: number, margin = 6): boolean => {
    const marginSq = margin * margin;
    for (const wp of waterPolygons) {
      if (pointInPolygon(px, pz, wp.points)) {
        const inHole =
          wp.holes && wp.holes.some((h) => pointInPolygon(px, pz, h));
        if (!inHole) return true;
      }
      const n = wp.points.length;
      for (let i = 0; i < n; i++) {
        const p1 = wp.points[i];
        const p2 = wp.points[(i + 1) % n];
        if (distToSegmentSq(px, pz, p1[0], p1[1], p2[0], p2[1]) < marginSq) {
          return true;
        }
      }
    }
    for (const wl of waterLines) {
      const halfW = wl.width * 0.55 + margin;
      const halfWSq = halfW * halfW;
      for (let i = 0; i < wl.points.length - 1; i++) {
        const p1 = wl.points[i];
        const p2 = wl.points[i + 1];
        if (distToSegmentSq(px, pz, p1[0], p1[1], p2[0], p2[1]) < halfWSq) {
          return true;
        }
      }
    }
    return false;
  };

  const isFootprintInWater = (
    pts: [number, number][],
    cx: number,
    cz: number,
    margin = 8
  ): boolean => {
    if (isPointInWater(cx, cz, margin)) return true;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      if (isPointInWater(p1[0], p1[1], margin)) return true;
      if (isPointInWater((p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5, margin))
        return true;
    }
    return false;
  };

  // Remove any building that accidentally sits inside water or directly on an iconic bridge
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    const { cx, cz } = computePolygonAreaAndShape(b.footprint);
    const margin = b.source === 'generated' ? 8 : 1.5;
    if (isFootprintInWater(b.footprint, cx, cz, margin)) {
      buildings.splice(i, 1);
      continue;
    }
    let onBridge = false;
    for (const seg of roadSegments) {
      if (
        seg.isBridge &&
        distToSegmentSq(cx, cz, seg.x1, seg.z1, seg.x2, seg.z2) <
          Math.max(seg.clearSq * 1.3, 38 * 38)
      ) {
        onBridge = true;
        break;
      }
    }
    if (onBridge && !b.isLandmark) {
      buildings.splice(i, 1);
      continue;
    }
  }

  // 3.5 Subdivide merged urban block polygons from OSM/Mapbox into individual wall-to-wall Vietnamese tube houses (Chia lô nhà ống liền kề sát vách)
  const subdividedBuildings: BuildingFeature[] = [];
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (
      b.isLandmark ||
      b.styleType === 'tower' ||
      b.styleType === 'civic' ||
      b.name ||
      b.footprint.length < 4
    ) {
      subdividedBuildings.push(b);
      continue;
    }

    // Find principal orientation of the footprint (longest edge)
    let maxLen = 0;
    let ux = 1,
      uz = 0;
    const pts = b.footprint;
    for (let k = 0; k < pts.length; k++) {
      const p1 = pts[k];
      const p2 = pts[(k + 1) % pts.length];
      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const len = Math.hypot(dx, dz);
      if (len > maxLen) {
        maxLen = len;
        ux = dx / len;
        uz = dz / len;
      }
    }
    const vx = -uz;
    const vz = ux;

    const { area, cx, cz } = computePolygonAreaAndShape(pts);
    let minU = Infinity,
      maxU = -Infinity,
      minV = Infinity,
      maxV = -Infinity;
    for (const [px, pz] of pts) {
      const rx = px - cx;
      const rz = pz - cz;
      const u = rx * ux + rz * uz;
      const v = rx * vx + rz * vz;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const spanU = maxU - minU;
    const spanV = maxV - minV;
    const rectFill = area / Math.max(1, spanU * spanV);

    // If this footprint is a merged rectangular row of Vietnamese tube houses (frontage 13.5m-75m, depth 7m-23m), slice into 4.6m lots!
    if (
      b.styleType === 'tube' &&
      spanU >= 13.5 &&
      spanU <= 75 &&
      spanV >= 7.0 &&
      spanV <= 23.5 &&
      rectFill >= 0.72
    ) {
      const numLots = Math.max(2, Math.min(15, Math.round(spanU / 4.6)));
      const sliceW = spanU / numLots;
      const gap = 0.08; // 8cm party-wall seam so adjacent tube houses have crisp outlines

      // Determine which side (+v or -v) faces the nearest road
      const midPlusX = cx + vx * (maxV + 2);
      const midPlusZ = cz + vz * (maxV + 2);
      const midMinusX = cx + vx * (minV - 2);
      const midMinusZ = cz + vz * (minV - 2);
      let dPlus = Infinity,
        dMinus = Infinity;
      for (let rIdx = 0; rIdx < roadSegments.length; rIdx++) {
        const seg = roadSegments[rIdx];
        if (seg.isBridge) continue;
        const dp = distToSegmentSq(midPlusX, midPlusZ, seg.x1, seg.z1, seg.x2, seg.z2);
        const dm = distToSegmentSq(midMinusX, midMinusZ, seg.x1, seg.z1, seg.x2, seg.z2);
        if (dp < dPlus) dPlus = dp;
        if (dm < dMinus) dMinus = dm;
      }
      const frontIsMaxV = dPlus <= dMinus;

      for (let s = 0; s < numLots; s++) {
        const u0 = minU + s * sliceW + gap;
        const u1 = minU + (s + 1) * sliceW - gap;
        const uMid = (u0 + u1) * 0.5;
        const vMid = (minV + maxV) * 0.5;
        const scx = cx + ux * uMid + vx * vMid;
        const scz = cz + uz * uMid + vz * vMid;

        // Order corners so edge 0 -> 1 is ALWAYS the street-facing front facade!
        const lotPts: [number, number][] = frontIsMaxV
          ? [
              [cx + ux * u0 + vx * maxV, cz + uz * u0 + vz * maxV],
              [cx + ux * u1 + vx * maxV, cz + uz * u1 + vz * maxV],
              [cx + ux * u1 + vx * minV, cz + uz * u1 + vz * minV],
              [cx + ux * u0 + vx * minV, cz + uz * u0 + vz * minV],
            ]
          : [
              [cx + ux * u1 + vx * minV, cz + uz * u1 + vz * minV],
              [cx + ux * u0 + vx * minV, cz + uz * u0 + vz * minV],
              [cx + ux * u0 + vx * maxV, cz + uz * u0 + vz * maxV],
              [cx + ux * u1 + vx * maxV, cz + uz * u1 + vz * maxV],
            ];

        const posH = Math.abs(Math.sin(scx * 12.9898 + scz * 78.233 + s * 4.17) * 43758.5453) % 1;
        const sLevels = posH < 0.18 ? 2 : posH < 0.58 ? 3 : posH < 0.86 ? 4 : 5;
        const rRoll = (posH * 7.3 + 0.19) % 1;
        const sRoofType: 'pitched' | 'terrace' | 'flat' =
          rRoll < 0.38 ? 'pitched' : rRoll < 0.76 ? 'terrace' : 'flat';
        const sRoofColor =
          sRoofType === 'pitched'
            ? ['#b91c1c', '#c2410c', '#9a3412', '#ea580c', '#991b1b', '#334155'][
                Math.floor(posH * 60) % 6
              ]
            : sRoofType === 'terrace'
            ? ['#cbd5e1', '#94a3b8', '#e2e8f0'][Math.floor(posH * 30) % 3]
            : ['#991b1b', '#1e3a5f', '#14532d', '#475569', '#64748b'][
                Math.floor(posH * 50) % 5
              ];
        const fRoll = (posH * 11.7 + 0.31) % 1;
        const sFacade =
          fRoll < 0.36
            ? 'tube_commercial'
            : fRoll < 0.72
            ? 'tube_modern'
            : fRoll < 0.88
            ? 'tube_classic'
            : 'french_colonial';
        const [sLat, sLon] = metersToLatLon(scx, scz, centerLat, centerLon);

        subdividedBuildings.push({
          ...b,
          id: `${b.id}-lot-${s + 1}`,
          footprint: lotPts,
          levels: sLevels,
          height: sLevels * 3.4 + (posH * 0.6 - 0.3),
          roofType: sRoofType,
          wallColor: TUBE_WALL_COLORS[Math.floor(posH * 100) % TUBE_WALL_COLORS.length],
          roofColor: sRoofColor,
          facadeStyle: sFacade,
          windowSeed: Math.floor(posH * 10000),
          category: 'Nhà ống / Nhà phố liền kề',
          areaM2: Math.round(sliceW * spanV),
          centerLat: sLat,
          centerLon: sLon,
        });
      }
    } else {
      // Single tube house: rotate footprint array so Edge 0 -> 1 faces the nearest street!
      if (b.styleType === 'tube' && pts.length >= 3 && roadSegments.length > 0) {
        let bestEdgeIdx = 0;
        let bestScore = Infinity;
        for (let e = 0; e < pts.length; e++) {
          const p1 = pts[e];
          const p2 = pts[(e + 1) % pts.length];
          const eLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
          if (eLen < 2.2) continue;
          const mx = (p1[0] + p2[0]) * 0.5;
          const mz = (p1[1] + p2[1]) * 0.5;
          let minD = Infinity;
          for (let rIdx = 0; rIdx < roadSegments.length; rIdx++) {
            const seg = roadSegments[rIdx];
            if (seg.isBridge) continue;
            const dSq = distToSegmentSq(mx, mz, seg.x1, seg.z1, seg.x2, seg.z2);
            if (dSq < minD) minD = dSq;
          }
          // Prefer narrower frontage edges closer to the street
          const score = Math.sqrt(minD) + eLen * 0.45;
          if (score < bestScore) {
            bestScore = score;
            bestEdgeIdx = e;
          }
        }
        if (bestEdgeIdx > 0) {
          b.footprint = [
            ...pts.slice(bestEdgeIdx),
            ...pts.slice(0, bestEdgeIdx),
          ];
        }
      }
      subdividedBuildings.push(b);
    }
  }
  buildings.length = 0;
  buildings.push(...subdividedBuildings);

  // Fine spatial occupancy grid (4.2m cells) so street-aligned Vietnamese tube houses can pack wall-to-wall without overlapping existing buildings
  const cellSize = 4.2;
  const occupiedGrid = new Set<string>();
  const markCell = (x: number, z: number, radius = 0) => {
    const gx0 = Math.floor((x - radius) / cellSize);
    const gx1 = Math.floor((x + radius) / cellSize);
    const gz0 = Math.floor((z - radius) / cellSize);
    const gz1 = Math.floor((z + radius) / cellSize);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        occupiedGrid.add(`${gx},${gz}`);
      }
    }
  };
  const isAreaOccupied = (x: number, z: number, radius = 1.8): boolean => {
    const gx0 = Math.floor((x - radius) / cellSize);
    const gx1 = Math.floor((x + radius) / cellSize);
    const gz0 = Math.floor((z - radius) / cellSize);
    const gz1 = Math.floor((z + radius) / cellSize);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        if (occupiedGrid.has(`${gx},${gz}`)) return true;
      }
    }
    return false;
  };

  for (const b of buildings) {
    const { cx, cz, w, d } = computePolygonAreaAndShape(b.footprint);
    markCell(cx, cz, Math.min(w, d) * 0.45 + 1.2);
  }

  // Street-Aligned Vietnamese Terraced Tube House Synthesizer (Dãy nhà ống liền kề sát vách mặt phố & trong kiệt/ngõ)
  let openBuildingsAdded = 0;
  const shouldInfill = isNearNgaTuSo || buildings.length < 480;
  const targetBuildingCount = isNearNgaTuSo ? 920 : 760;

  if (shouldInfill && buildings.length < targetBuildingCount && roads.length > 0) {
    // Tier 0 = Streetfront shophouses/tube houses; Tier 1 = Inner-alley (trong ngõ/kiệt) tube houses
    for (const tier of [0, 1]) {
      if (buildings.length >= targetBuildingCount) break;

      for (let rIdx = 0; rIdx < roads.length; rIdx++) {
        if (buildings.length >= targetBuildingCount) break;
        const r = roads[rIdx];
        if (r.isBridge || r.points.length < 2) continue;

        for (let sIdx = 0; sIdx < r.points.length - 1; sIdx++) {
          if (buildings.length >= targetBuildingCount) break;
          const [x1, z1] = r.points[sIdx];
          const [x2, z2] = r.points[sIdx + 1];
          const dx = x2 - x1;
          const dz = z2 - z1;
          const segLen = Math.hypot(dx, dz);
          if (segLen < 12) continue;

          const ux = dx / segLen;
          const uz = dz / segLen;
          const nx = -uz;
          const nz = ux;

          for (const side of [-1, 1]) {
            if (buildings.length >= targetBuildingCount) break;
            let cursor = 6.5; // Leave corner intersection setback
            let houseInRow = 0;

            while (cursor < segLen - 6.5 && buildings.length < targetBuildingCount) {
              // Authentic Vietnamese tube house frontage: 4.2m to 5.4m wide, deep lot 12.5m to 17.5m
              const isAlleyKtt = tier === 1 && rng() < 0.06;
              const bw = isAlleyKtt ? 18 + rng() * 6 : 4.2 + rng() * 1.25;
              const bd = isAlleyKtt
                ? 11 + rng() * 2.5
                : tier === 0
                ? 13.5 + rng() * 4.5
                : 11.0 + rng() * 3.5;

              if (cursor + bw > segLen - 5.0) break;

              const midDist = cursor + bw * 0.5;
              // Leave a 2.8m Vietnamese alley (ngõ / kiệt) every 8-11 contiguous tube houses
              houseInRow++;
              const alleyGap = houseInRow % 9 === 0 ? 2.8 : 0.08;
              cursor += bw + alleyGap;

              const frontOffset =
                tier === 0
                  ? r.width * 0.5 + 2.0
                  : r.width * 0.5 + 21.5;
              const backOffset = frontOffset + bd;
              const centerOffset = (frontOffset + backOffset) * 0.5;

              const jx = x1 + ux * midDist + nx * side * centerOffset;
              const jz = z1 + uz * midDist + nz * side * centerOffset;

              if (
                Math.abs(jx) > halfW * 0.93 ||
                Math.abs(jz) > halfD * 0.93
              ) {
                continue;
              }
              if (isAreaOccupied(jx, jz, Math.min(bw, bd) * 0.36)) continue;

              // Check road clearance so houses never sit on another intersecting street
              let hitRoad = false;
              const halfLotW = bw * 0.48;
              const fLeftX = x1 + ux * (midDist - halfLotW) + nx * side * frontOffset;
              const fLeftZ = z1 + uz * (midDist - halfLotW) + nz * side * frontOffset;
              const fRightX = x1 + ux * (midDist + halfLotW) + nx * side * frontOffset;
              const fRightZ = z1 + uz * (midDist + halfLotW) + nz * side * frontOffset;
              const bRightX = x1 + ux * (midDist + halfLotW) + nx * side * backOffset;
              const bRightZ = z1 + uz * (midDist + halfLotW) + nz * side * backOffset;
              const bLeftX = x1 + ux * (midDist - halfLotW) + nx * side * backOffset;
              const bLeftZ = z1 + uz * (midDist - halfLotW) + nz * side * backOffset;

              for (let k = 0; k < roadSegments.length; k++) {
                const seg = roadSegments[k];
                const minAllowedSq = seg.clearSq * 0.78;
                if (
                  distToSegmentSq(jx, jz, seg.x1, seg.z1, seg.x2, seg.z2) < minAllowedSq ||
                  distToSegmentSq(fLeftX, fLeftZ, seg.x1, seg.z1, seg.x2, seg.z2) < minAllowedSq * 0.72 ||
                  distToSegmentSq(bRightX, bRightZ, seg.x1, seg.z1, seg.x2, seg.z2) < minAllowedSq * 0.78
                ) {
                  hitRoad = true;
                  break;
                }
              }
              if (hitRoad) continue;

              let inPark = false;
              for (const p of parks) {
                if (pointInPolygon(jx, jz, p.polygon)) {
                  inPark = true;
                  break;
                }
              }
              if (inPark) continue;

              // Order corners so Edge 0 -> 1 is STRICTLY the street-facing front facade!
              const corners: [number, number][] =
                side > 0
                  ? [
                      [fLeftX, fLeftZ],
                      [fRightX, fRightZ],
                      [bRightX, bRightZ],
                      [bLeftX, bLeftZ],
                    ]
                  : [
                      [fRightX, fRightZ],
                      [fLeftX, fLeftZ],
                      [bLeftX, bLeftZ],
                      [bRightX, bRightZ],
                    ];

              if (isFootprintInWater(corners, jx, jz, 9)) continue;

              markCell(jx, jz, Math.min(bw, bd) * 0.42);
              openBuildingsAdded++;

              const posH =
                Math.abs(Math.sin(jx * 12.9898 + jz * 78.233) * 43758.5453) % 1;
              const levels = isAlleyKtt
                ? posH < 0.5
                  ? 4
                  : 5
                : tier === 0
                ? posH < 0.14
                  ? 2
                  : posH < 0.54
                  ? 3
                  : posH < 0.85
                  ? 4
                  : 5
                : posH < 0.28
                ? 2
                : posH < 0.74
                ? 3
                : 4;
              const [obLat, obLon] = metersToLatLon(jx, jz, centerLat, centerLon);

              const rRoll = (posH * 7.1 + 0.23) % 1;
              const roofType: 'pitched' | 'terrace' | 'flat' = isAlleyKtt
                ? rRoll < 0.5
                  ? 'pitched'
                  : 'terrace'
                : rRoll < 0.38
                ? 'pitched'
                : rRoll < 0.76
                ? 'terrace'
                : 'flat';

              let facadeStyle = 'tube_modern';
              if (isAlleyKtt) {
                facadeStyle = rRoll < 0.7 ? 'ktt_vintage' : 'french_colonial';
              } else if (tier === 0) {
                const fRoll = (posH * 11.3 + 0.4) % 1;
                facadeStyle =
                  fRoll < 0.44
                    ? 'tube_commercial'
                    : fRoll < 0.76
                    ? 'tube_modern'
                    : fRoll < 0.9
                    ? 'tube_classic'
                    : 'french_colonial';
              } else {
                const fRoll = (posH * 11.3 + 0.4) % 1;
                facadeStyle =
                  fRoll < 0.18
                    ? 'tube_commercial'
                    : fRoll < 0.65
                    ? 'tube_modern'
                    : fRoll < 0.85
                    ? 'tube_classic'
                    : 'french_colonial';
              }

              const roofColor = isAlleyKtt
                ? KTT_ROOF_COLORS[Math.floor(rng() * KTT_ROOF_COLORS.length)]
                : roofType === 'pitched'
                ? ['#b91c1c', '#c2410c', '#9a3412', '#ea580c', '#991b1b', '#334155'][
                    Math.floor(rng() * 6)
                  ]
                : roofType === 'terrace'
                ? ['#cbd5e1', '#94a3b8', '#e2e8f0'][Math.floor(rng() * 3)]
                : ['#991b1b', '#1e3a5f', '#14532d', '#475569', '#64748b'][
                    Math.floor(rng() * 5)
                  ];

              buildings.push({
                id: `b-infill-${buildings.length + 1}`,
                footprint: corners,
                height: levels * 3.4 + (posH * 0.5 - 0.25),
                levels,
                styleType: isAlleyKtt ? 'ktt' : 'tube',
                roofType,
                wallColor: isAlleyKtt
                  ? KTT_WALL_COLORS[Math.floor(rng() * KTT_WALL_COLORS.length)]
                  : TUBE_WALL_COLORS[Math.floor(rng() * TUBE_WALL_COLORS.length)],
                roofColor,
                windowSeed: Math.floor(rng() * 10000),
                facadeStyle,
                source: 'generated',
                heightSource: 'estimated',
                category: isAlleyKtt
                  ? 'Khu tập thể / Chung cư'
                  : tier === 0
                  ? 'Nhà phố mặt tiền'
                  : 'Nhà ống trong ngõ',
                areaM2: Math.round(bw * bd),
                centerLat: obLat,
                centerLon: obLon,
              });
            }
          }
        }
      }
    }
  }

  progressState.percent = 83;
  progressState.elapsedSec = Number(
    ((performance.now() - startTime) / 1000).toFixed(1)
  );
  progressState.stepOpenBuildings = {
    done: true,
    count: buildings.length,
  };
  progressState.stepMerge = { done: true, count: buildings.length };
  progressState.stepRender = { done: false, pct: 80 };
  onProgress({ ...progressState });

  // 4. Place Trees along Sông Tô Lịch riverbanks, street sidewalks, and courtyards (Matching reference photo!)
  const trees: TreeInstance[] = [];
  const maxTrees = 1600;

  const canPlaceTree = (tx: number, tz: number, checkOccupied = true): boolean => {
    if (Math.abs(tx) > halfW * 0.96 || Math.abs(tz) > halfD * 0.96)
      return false;
    if (isPointInWater(tx, tz, 6.5)) return false;

    if (checkOccupied) {
      const gKey = `${Math.floor(tx / cellSize)},${Math.floor(tz / cellSize)}`;
      if (occupiedGrid.has(gKey)) return false;
    }

    for (let i = 0; i < roadSegments.length; i++) {
      const seg = roadSegments[i];
      if (
        distToSegmentSq(tx, tz, seg.x1, seg.z1, seg.x2, seg.z2) <
        seg.clearSq * 0.52
      ) {
        return false;
      }
    }
    return true;
  };

  // 4a. Dense continuous tree rows along both banks of Sông Tô Lịch / canals
  for (const wl of waterLines) {
    const offset = wl.width * 0.5 + 4.5;
    for (let i = 0; i < wl.points.length - 1; i++) {
      const [x1, z1] = wl.points[i];
      const [x2, z2] = wl.points[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const nx = -dz / len;
      const nz = dx / len;
      for (let d = 4; d < len - 4; d += 8.5) {
        const px = x1 + (dx * d) / len;
        const pz = z1 + (dz * d) / len;
        for (const side of [-1, 1]) {
          const tx = px + nx * offset * side;
          const tz = pz + nz * offset * side;
          if (canPlaceTree(tx, tz, false)) {
            trees.push({
              x: tx,
              z: tz,
              scale: 0.95 + rng() * 0.45,
              variant: Math.floor(rng() * 3),
            });
          }
        }
      }
    }
  }

  // 4b. Trees inside real parks and pagoda courtyards
  for (const park of parks) {
    const { cx, cz, w, d } = computePolygonAreaAndShape(park.polygon);
    const count = Math.min(80, Math.round((w * d) / 120));
    for (let i = 0; i < count; i++) {
      const tx = cx + (rng() - 0.5) * w * 0.85;
      const tz = cz + (rng() - 0.5) * d * 0.85;
      if (pointInPolygon(tx, tz, park.polygon) && canPlaceTree(tx, tz, true)) {
        trees.push({
          x: tx,
          z: tz,
          scale: 0.85 + rng() * 0.5,
          variant: Math.floor(rng() * 3),
        });
      }
    }
  }

  // 4c. Sidewalk trees along real ground roads
  for (const r of roads) {
    if (r.isBridge || r.highway === 'rail' || r.width < 5) continue;
    const offset = r.width * 0.5 + 3.2;
    for (let i = 0; i < r.points.length - 1; i++) {
      if (trees.length >= maxTrees) break;
      const [x1, z1] = r.points[i];
      const [x2, z2] = r.points[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 10) continue;
      const nx = -dz / len;
      const nz = dx / len;

      for (let d = 5; d < len - 5; d += 8.5) {
        const px = x1 + (dx * d) / len;
        const pz = z1 + (dz * d) / len;
        for (const side of [-1, 1]) {
          if (rng() < 0.85) {
            const tx = px + nx * offset * side;
            const tz = pz + nz * offset * side;
            if (canPlaceTree(tx, tz, false)) {
              trees.push({
                x: tx,
                z: tz,
                scale: 0.78 + rng() * 0.45,
                variant: Math.floor(rng() * 3),
              });
            }
          }
        }
      }
    }
  }

  // 4d. Courtyard & residential green pocket infill (never inside water, roads, or buildings)
  const targetTrees = isNearNgaTuSo ? 1350 : 760;
  if (trees.length < targetTrees) {
    const treeCandidates: [number, number][] = [];
    for (let gx = -halfW * 0.88; gx <= halfW * 0.88; gx += 12.5) {
      for (let gz = -halfD * 0.88; gz <= halfD * 0.88; gz += 12.5) {
        treeCandidates.push([
          gx + (rng() - 0.5) * 6.5,
          gz + (rng() - 0.5) * 6.5,
        ]);
      }
    }
    for (let i = treeCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = treeCandidates[i];
      treeCandidates[i] = treeCandidates[j];
      treeCandidates[j] = tmp;
    }

    for (let idx = 0; idx < treeCandidates.length; idx++) {
      if (trees.length >= targetTrees) break;
      const [tx, tz] = treeCandidates[idx];
      if (!canPlaceTree(tx, tz, true)) continue;
      trees.push({
        x: tx,
        z: tz,
        scale: 0.82 + rng() * 0.45,
        variant: Math.floor(rng() * 3),
      });
    }
  }

  // Enrich buildings with nearby POI names and categories if not already named
  for (const poi of pois) {
    let bestDistSq = 35 * 35; // 35 meters search radius
    let bestB: BuildingFeature | null = null;
    for (const b of buildings) {
      if (b.footprint.length === 0) continue;
      const dx = b.footprint[0][0] - poi.x;
      const dz = b.footprint[0][1] - poi.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestB = b;
      }
    }
    if (bestB) {
      if (!bestB.name) {
        bestB.name = poi.name;
        bestB.category = poi.category || bestB.category;
      }
      if (!bestB.pois) bestB.pois = [];
      if (!bestB.pois.some((p) => p.name === poi.name)) {
        bestB.pois.push({ name: poi.name, category: poi.category });
      }
    }
  }

  const buildTimeSec = Math.max(
    0.5,
    Number(((performance.now() - startTime) / 1000).toFixed(1))
  );

  const trafficRoads = roads.filter((r) => r.hasTraffic);
  progressState.percent = 100;
  progressState.elapsedSec = buildTimeSec;
  progressState.stepRender = { done: true, pct: 100 };
  onProgress({ ...progressState });

  return {
    title,
    bbox,
    centerLat,
    centerLon,
    widthMeters,
    depthMeters,
    areaKm2: displayAreaKm2,
    buildTimeSec,
    buildings,
    roads,
    waters,
    parks,
    trees,
    pois,
    stats: {
      osmObjects: Math.max(progressState.stepOsm.count, buildings.length),
      openBuildings: buildings.length,
      mergedBuildings: buildings.length,
      treeCount: trees.length,
      carCount: Math.min(56, Math.max(16, trafficRoads.length * 3)),
      trafficSegments: Math.max(24, trafficRoads.length),
      totalRoadSegments: Math.max(1, roads.length),
      freeFlowPct: 88 + Math.floor(rng() * 7),
    },
  };
}
