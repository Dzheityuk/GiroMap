
export interface Coordinate {
  lat: number;
  lng: number;
}

export enum AppMode {
  PLANNING = 'PLANNING',
  TRACKING = 'TRACKING',
  BACKTRACK = 'BACKTRACK',
}

export type Language = 'RU' | 'EN';

export type PickingMode = 'from' | 'to' | 'correction' | null;

export type MapRotationMode = 'NORTH_UP' | 'HEADS_UP';

export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export interface RouteData {
  coordinates: Coordinate[];
  distance: number; // meters
  duration: number; // seconds
}

export interface SensorData {
  steps: number;
  heading: number; // 0-360
  isWalking: boolean;
}
