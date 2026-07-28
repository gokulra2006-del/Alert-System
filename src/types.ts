export type Role = 'student' | 'warden' | 'admin';

export type IncidentType = 'fire' | 'medical' | 'security' | 'hazmat' | 'other' | 'elevator';

export type Severity = 'low' | 'medium' | 'high' | 'critical' | 'pending';

export type IncidentStatus = 'active' | 'acknowledged' | 'resolved' | 'archived';

export type ZoneId = 'north' | 'south' | 'east' | 'west';

export type TriageTag = 'immediate' | 'delayed' | 'minor' | 'deceased' | null;

export type BuildingStatus = 'clear' | 'damaged' | 'do_not_enter';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  zone: ZoneId | null;
  location: LatLng;
  description: string;
  reportedBy: string;
  reportedAt: number;  // epoch ms
  updatedAt: number;
  acknowledgedBy?: string;
  resolvedBy?: string;
  isEscalated?: boolean;
  isSOS?: boolean;
  notes?: string;
  isDemoInjected?: boolean;          // Feature 10: demo scenario cleanup flag

  // Feature 1 — Media capture
  mediaUrl?: string;
  thumbnailUrl?: string;
  audioUrl?: string;

  // Feature 3 — Response timer
  responseStartTime?: number;        // epoch ms, set on Acknowledge
  responseEndTime?: number;          // epoch ms, set on Resolve

  // Feature 3 — Resource dispatch
  responderResource?: string;

  // Feature 6 — Triage tag
  triageTag?: TriageTag;

  // Feature 4 — Merge Incidents
  subIncidents?: string[];
  isMerged?: boolean;

  // Feature 7 — Wind Direction / Contamination
  windDirection?: 'N' | 'S' | 'E' | 'W';
  contaminationRadius?: number;

  // Feature 8 — Elevator Entrapment specific
  buildingName?: string;
  elevatorNumber?: string;
  floorRange?: string;
}

export interface Zone {
  id: ZoneId;
  name: string;
  shortName: string;
  polygon: [number, number][];
  capacity: number;
  assemblyPoint: LatLng;             // Feature 5: evacuation assembly point
  isLockdown: boolean;               // Feature 8: lockdown state
  buildingStatus: BuildingStatus;    // Feature 9: building status overlay
}

export interface BroadcastMessage {
  id: string;
  text: string;
  sender: string;
  sentAt: number;
  targetZone?: ZoneId | 'all';
  type: 'info' | 'warning' | 'critical';
}

// Feature 4: Safety infrastructure marker types
export type SafetyItemType = 'aed' | 'extinguisher' | 'first_aid';

export interface SafetyMarker {
  id: string;
  type: SafetyItemType;
  lat: number;
  lng: number;
  locationLabel: string;
  zone: ZoneId;
}

// ── Auth System (Feature 1) ──────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Fake hash for demo
  role: Role;
  zone?: ZoneId; // e.g. warden assigned zone, or student registered zone
}

export interface CheckInRecord {
  id: string;
  userId: string;
  zoneId: ZoneId;
  timestamp: number;
}

export interface CheckInRequest {
  id: string;
  zoneId: ZoneId | 'all';
  timestamp: number;
  requestedBy: string;
}

// ── Zone data (extended with assembly points, lockdown, buildingStatus) ───────
export const ZONES: Zone[] = [
  {
    id: 'north',
    name: 'Academic Block (AB-1)',
    shortName: 'AB-1',
    polygon: [[12.8432, 80.1545], [12.8432, 80.1555], [12.8426, 80.1555], [12.8426, 80.1545]],
    capacity: 10,
    assemblyPoint: { lat: 12.8434, lng: 80.155 },
    isLockdown: false,
    buildingStatus: 'clear',
  },
  {
    id: 'south',
    name: "Hostel Blocks (Men's/Women's Hostel)",
    shortName: 'Hostels',
    polygon: [[12.8414, 80.1545], [12.8414, 80.1555], [12.8408, 80.1555], [12.8408, 80.1545]],
    capacity: 10,
    assemblyPoint: { lat: 12.8406, lng: 80.155 },
    isLockdown: false,
    buildingStatus: 'clear',
  },
  {
    id: 'east',
    name: 'Technology Tower / Anna Auditorium',
    shortName: 'Tech Tower',
    polygon: [[12.8426, 80.1558], [12.8426, 80.1566], [12.8418, 80.1566], [12.8418, 80.1558]],
    capacity: 10,
    assemblyPoint: { lat: 12.8422, lng: 80.1569 },
    isLockdown: false,
    buildingStatus: 'clear',
  },
  {
    id: 'west',
    name: 'Food Court, Sports Complex & Admin Block',
    shortName: 'Sports & Admin',
    polygon: [[12.8426, 80.1534], [12.8426, 80.1544], [12.8418, 80.1544], [12.8418, 80.1534]],
    capacity: 10,
    assemblyPoint: { lat: 12.8422, lng: 80.1531 },
    isLockdown: false,
    buildingStatus: 'clear',
  },
];

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 5,
  pending: 1,
};

export const INCIDENT_COLORS: Record<IncidentType, string> = {
  fire: '#DC2626',
  medical: '#2563EB',
  security: '#D97706',
  hazmat: '#10B981',
  other: '#7C3AED',
  elevator: '#0EA5E9',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#DC2626',
  pending: '#6B7280',
};

export const TRIAGE_COLORS: Record<NonNullable<TriageTag>, string> = {
  immediate: '#DC2626',
  delayed: '#F59E0B',
  minor: '#22C55E',
  deceased: '#1F2937',
};

export const BUILDING_STATUS_COLORS: Record<BuildingStatus, string> = {
  clear: '#22C55E',
  damaged: '#F59E0B',
  do_not_enter: '#DC2626',
};

export const SAFETY_ITEM_ICONS: Record<SafetyItemType, string> = {
  aed: '🫀',
  extinguisher: '🧯',
  first_aid: '➕',
};

export function computeZonePressure(incidents: Incident[], zone: Zone): number {
  const active = incidents.filter(
    (i) => i.zone === zone.id && i.status === 'active' && !i.isMerged
  );
  const score = active.reduce(
    (sum, inc) => sum + SEVERITY_WEIGHT[inc.severity],
    0
  );
  return Math.min(score / zone.capacity, 1);
}

export function getPressureColor(pressure: number): string {
  if (pressure < 0.3) return '#22C55E';
  if (pressure < 0.6) return '#F59E0B';
  if (pressure < 0.85) return '#F97316';
  return '#DC2626';
}

export function getPressureLabel(pressure: number): string {
  if (pressure < 0.3) return 'Normal';
  if (pressure < 0.6) return 'Elevated';
  if (pressure < 0.85) return 'High';
  return 'Critical';
}

export function getZoneForLocation(location: LatLng): ZoneId | null {
  for (const zone of ZONES) {
    const poly = zone.polygon;
    const lats = poly.map((p) => p[0]);
    const lngs = poly.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    if (
      location.lat >= minLat && location.lat <= maxLat &&
      location.lng >= minLng && location.lng <= maxLng
    ) {
      return zone.id;
    }
  }
  return 'north';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ── Demo Users ───────────────────────────────────────────────────────────────
export const DEMO_USERS: User[] = [
  { id: 'U_S1', name: 'Arjun Mehta', email: 'student1@vitchennai.edu', passwordHash: 'pwd', role: 'student', zone: 'north' },
  { id: 'U_S2', name: 'Priya Rajan', email: 'student2@vitchennai.edu', passwordHash: 'pwd', role: 'student', zone: 'south' },
  { id: 'U_S3', name: 'Karthik Nair', email: 'student3@vitchennai.edu', passwordHash: 'pwd', role: 'student', zone: 'east' },
  { id: 'U_S4', name: 'Divya Sharma', email: 'student4@vitchennai.edu', passwordHash: 'pwd', role: 'student', zone: 'west' },
  { id: 'U_W1', name: 'Warden North', email: 'warden.north@vitchennai.edu', passwordHash: 'pwd', role: 'warden', zone: 'north' },
  { id: 'U_W2', name: 'Warden South', email: 'warden.south@vitchennai.edu', passwordHash: 'pwd', role: 'warden', zone: 'south' },
  { id: 'U_A1', name: 'System Admin', email: 'admin@vitchennai.edu', passwordHash: 'pwd', role: 'admin' },
];
