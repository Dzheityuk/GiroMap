
import { Coordinate, SearchResult } from '../types';
import { EARTH_RADIUS } from '../constants';

/**
 * Calculates a new coordinate based on a start point, distance (meters), and bearing (degrees).
 * Dead Reckoning Formula.
 */
export const calculateNewPosition = (
  start: Coordinate,
  distanceMeters: number,
  bearingDegrees: number
): Coordinate => {
  const lat1 = (start.lat * Math.PI) / 180;
  const lon1 = (start.lng * Math.PI) / 180;
  const bearingRad = (bearingDegrees * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceMeters / EARTH_RADIUS) +
    Math.cos(lat1) * Math.sin(distanceMeters / EARTH_RADIUS) * Math.cos(bearingRad)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distanceMeters / EARTH_RADIUS) * Math.cos(lat1),
    Math.cos(distanceMeters / EARTH_RADIUS) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lon2 * 180) / Math.PI,
  };
};

/**
 * Get distance between two coordinates in meters.
 */
export const getDistance = (c1: Coordinate, c2: Coordinate): number => {
  const R = EARTH_RADIUS; // metres
  const φ1 = (c1.lat * Math.PI) / 180;
  const φ2 = (c2.lat * Math.PI) / 180;
  const Δφ = ((c2.lat - c1.lat) * Math.PI) / 180;
  const Δλ = ((c2.lng - c1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Convert coordinates to address string (Reverse Geocoding)
 */
export const reverseGeocode = async (coord: Coordinate): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coord.lat}&lon=${coord.lng}&zoom=18&addressdetails=1`
    );
    const data = await res.json();
    
    if (data && data.display_name) {
      // Try to construct a shorter address
      const addr = data.address;
      if (addr) {
        const road = addr.road || addr.pedestrian || addr.street;
        const number = addr.house_number;
        if (road && number) return `${road}, ${number}`;
        if (road) return road;
      }
      // Fallback to full name if structured data is missing
      return data.display_name.split(',')[0];
    }
  } catch (e) {
    console.error("Reverse geocoding failed", e);
  }
  return `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`;
};

/**
 * Get address suggestions for autocomplete
 */
export const getAddressSuggestions = async (query: string, lang: string): Promise<SearchResult[]> => {
  if (!query || query.length < 3) return [];
  try {
    const acceptLang = lang === 'RU' ? 'ru' : 'en';
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&accept-language=${acceptLang}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    // Map to ensure it fits SearchResult if structure varies, though Nominatim usually returns display_name, lat, lon
    return data;
  } catch (e) {
    console.error("Autocomplete failed", e);
    return [];
  }
};
