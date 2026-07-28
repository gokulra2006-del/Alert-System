import { LatLng, SafetyMarker } from '../types';

/**
 * Calculates the distance between two coordinates in meters using the Haversine formula.
 */
export function getDistanceInMeters(loc1: LatLng, loc2: LatLng): number {
  const R = 6371e3; // Earth radius in meters
  const lat1 = (loc1.lat * Math.PI) / 180;
  const lat2 = (loc2.lat * Math.PI) / 180;
  const deltaLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const deltaLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Finds the nearest safety marker of a specific type.
 */
export function findNearestMarker(
  location: LatLng,
  markers: SafetyMarker[],
  type: SafetyMarker['type']
): { marker: SafetyMarker; distance: number } | null {
  const filtered = markers.filter(m => m.type === type);
  if (filtered.length === 0) return null;

  let nearest = filtered[0];
  let minDistance = getDistanceInMeters(location, { lat: nearest.lat, lng: nearest.lng });

  for (let i = 1; i < filtered.length; i++) {
    const marker = filtered[i];
    const distance = getDistanceInMeters(location, { lat: marker.lat, lng: marker.lng });
    if (distance < minDistance) {
      minDistance = distance;
      nearest = marker;
    }
  }

  return { marker: nearest, distance: Math.round(minDistance) };
}
