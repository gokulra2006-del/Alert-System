import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import {
  Incident,
  IncidentType,
  Severity,
  ZoneId,
  ZONES,
  generateId,
} from '../types';

const TYPES: IncidentType[] = ['fire', 'medical', 'security', 'other'];
const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];
const ZONE_IDS: ZoneId[] = ['north', 'south', 'east', 'west'];

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randLocationInZone(zoneId: ZoneId): { lat: number; lng: number } {
  const zone = ZONES.find((z) => z.id === zoneId)!;
  const lats = zone.polygon.map((p) => p[0]);
  const lngs = zone.polygon.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    lat: minLat + Math.random() * (maxLat - minLat),
    lng: minLng + Math.random() * (maxLng - minLng),
  };
}

const DESCRIPTIONS: Record<IncidentType, string[]> = {
  fire: [
    'Smoke visible near stairwell',
    'Fire alarm triggered in lab',
    'Electrical short circuit reported',
    'Burning smell in corridor',
  ],
  medical: [
    'Student feeling faint',
    'Allergic reaction reported',
    'Injury from sports activity',
    'Student unresponsive',
  ],
  security: [
    'Unauthorized person on campus',
    'Suspicious package found',
    'Theft reported in canteen',
    'Trespassing at main gate',
  ],
  other: [
    'Water pipe burst',
    'Elevator stuck with students',
    'Gas leak smell reported',
    'Flooding in basement',
  ],
};

export function useSimulator(enabled = false) {
  const { addIncident } = useStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(() => {
      const type = randItem(TYPES);
      const zone = randItem(ZONE_IDS);
      const location = randLocationInZone(zone);

      const incident: Incident = {
        id: generateId(),
        type,
        severity: randItem(SEVERITIES),
        status: 'active',
        zone,
        location,
        description: randItem(DESCRIPTIONS[type]),
        reportedBy: 'Simulator',
        reportedAt: Date.now(),
        updatedAt: Date.now(),
      };
      addIncident(incident);
    }, 45000); // new incident every 45 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, addIncident]);
}
