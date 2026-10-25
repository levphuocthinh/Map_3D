export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface SearchSuggestion {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  osmKey?: string;
  osmValue?: string;
  extent?: [number, number, number, number];
}

export type BuildingStyleType = 'tube' | 'ktt' | 'tower' | 'commercial' | 'civic';

export type DataSource = 'mapbox' | 'osm' | 'generated';

export interface BuildingFeature {
  id: string;
  footprint: [number, number][]; // Local meters [x, z]
  height: number;
  minHeight?: number;
  levels: number;
  styleType: BuildingStyleType;
  roofType: 'flat' | 'pitched' | 'terrace';
  wallColor: string;
  roofColor: string;
  windowSeed: number;
  name?: string;
  isLandmark?: boolean;
  landmarkType?: string;
  facadeStyle?: string;

  // Metadata shown in the hover info card
  source: DataSource;
  heightSource: 'data' | 'levels' | 'estimated';
  category: string;
  osmType?: string;
  areaM2: number;
  centerLat: number;
  centerLon: number;
  address?: string;
  geocodedAddress?: string;
  pois?: { name: string; category: string }[];
  phone?: string;
  website?: string;
  openingHours?: string;
}

export type PickInfo =
  | { kind: 'building'; building: BuildingFeature }
  | { kind: 'road'; road: RoadFeature }
  | { kind: 'water'; water: WaterFeature };

export interface RoadFeature {
  id: string;
  points: [number, number][]; // Local meters [x, z]
  width: number;
  highway: string;
  layer: number;
  isBridge: boolean;
  name?: string;
  hasTraffic: boolean;
  congestion: 'free' | 'moderate' | 'heavy';
  bridgeType?: 'dragon' | 'song_han_swing' | 'tran_thi_ly' | 'thuan_phuoc';
}

export interface WaterFeature {
  id: string;
  points: [number, number][]; // Local meters [x, z]
  holes?: [number, number][][]; // Optional interior land/island holes in local meters
  isPolygon: boolean;
  width: number;
  name?: string;
}

export interface ParkFeature {
  id: string;
  polygon: [number, number][];
}

export interface TreeInstance {
  x: number;
  z: number;
  scale: number;
  variant: number;
}

export interface POILabel {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  category: string;
}

export interface CityStats {
  osmObjects: number;
  openBuildings: number;
  mergedBuildings: number;
  treeCount: number;
  carCount: number;
  trafficSegments: number;
  totalRoadSegments: number;
  freeFlowPct: number;
}

export interface CityModelData {
  title: string;
  bbox: BoundingBox;
  centerLat: number;
  centerLon: number;
  widthMeters: number;
  depthMeters: number;
  areaKm2: number;
  buildTimeSec: number;
  buildings: BuildingFeature[];
  roads: RoadFeature[];
  waters: WaterFeature[];
  parks: ParkFeature[];
  trees: TreeInstance[];
  pois: POILabel[];
  stats: CityStats;
}

export interface BuildProgress {
  active: boolean;
  regionName: string;
  percent: number;
  elapsedSec: number;
  areaKm2: number;
  stepOsm: { done: boolean; count: number };
  stepOpenBuildings: { done: boolean; count: number };
  stepMerge: { done: boolean; count: number };
  stepRender: { done: boolean; pct: number };
}

export type WeatherConditionType = 'clear' | 'cloudy' | 'rain' | 'fog';

export interface WeatherInfo {
  tempC: number;
  condition: string;
  conditionType: WeatherConditionType;
  isNight: boolean;
  timeStr: string;
  timeMinutes: number; // 0..1439 (e.g. 07:49 = 469)
}
