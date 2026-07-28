import { SafetyMarker } from '../types';

/**
 * Static seed data — 12 safety infrastructure markers spread across all 4 campus zones.
 * These are read-only; never mutated at runtime.
 */
export const SAFETY_MARKERS: SafetyMarker[] = [
  // ── North Zone (AB-1 Academic Block) ────────────────────────────────────────
  {
    id: 'sm-01',
    type: 'aed',
    lat: 12.8430,
    lng: 80.1548,
    locationLabel: 'AB-1, Ground Floor — Near Main Entrance',
    zone: 'north',
  },
  {
    id: 'sm-02',
    type: 'extinguisher',
    lat: 12.8428,
    lng: 80.1553,
    locationLabel: 'AB-1, 2nd Floor — Lab Corridor Stairwell',
    zone: 'north',
  },
  {
    id: 'sm-03',
    type: 'first_aid',
    lat: 12.8431,
    lng: 80.1550,
    locationLabel: 'AB-1, 1st Floor — Staff Room adjacent',
    zone: 'north',
  },

  // ── South Zone (Hostel Blocks) ───────────────────────────────────────────────
  {
    id: 'sm-04',
    type: 'aed',
    lat: 12.8412,
    lng: 80.1548,
    locationLabel: "Men's Hostel, Ground Floor — Near Warden Office",
    zone: 'south',
  },
  {
    id: 'sm-05',
    type: 'extinguisher',
    lat: 12.8410,
    lng: 80.1552,
    locationLabel: "Women's Hostel, Ground Floor — Near Stairs",
    zone: 'south',
  },
  {
    id: 'sm-06',
    type: 'first_aid',
    lat: 12.8413,
    lng: 80.1550,
    locationLabel: 'Hostel Common Room — First Floor',
    zone: 'south',
  },

  // ── East Zone (Technology Tower / Anna Auditorium) ───────────────────────────
  {
    id: 'sm-07',
    type: 'aed',
    lat: 12.8424,
    lng: 80.1560,
    locationLabel: 'Technology Tower, Lobby — Ground Floor',
    zone: 'east',
  },
  {
    id: 'sm-08',
    type: 'extinguisher',
    lat: 12.8421,
    lng: 80.1564,
    locationLabel: 'Anna Auditorium — Stage-side Exit',
    zone: 'east',
  },
  {
    id: 'sm-09',
    type: 'first_aid',
    lat: 12.8422,
    lng: 80.1561,
    locationLabel: 'Tech Tower, 3rd Floor — Server Room Corridor',
    zone: 'east',
  },

  // ── West Zone (Food Court / Sports / Admin Block) ────────────────────────────
  {
    id: 'sm-10',
    type: 'aed',
    lat: 12.8424,
    lng: 80.1537,
    locationLabel: 'Admin Block, Reception — Ground Floor',
    zone: 'west',
  },
  {
    id: 'sm-11',
    type: 'extinguisher',
    lat: 12.8420,
    lng: 80.1541,
    locationLabel: 'Food Court — Kitchen Entrance',
    zone: 'west',
  },
  {
    id: 'sm-12',
    type: 'first_aid',
    lat: 12.8422,
    lng: 80.1539,
    locationLabel: 'Sports Complex — Changing Room Corridor',
    zone: 'west',
  },
];
