import React from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Polyline,
  Marker,
  Tooltip,
  Popup,
  Circle,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../store';
import {
  INCIDENT_COLORS,
  TRIAGE_COLORS,
  BUILDING_STATUS_COLORS,
  SAFETY_ITEM_ICONS,
  computeZonePressure,
  getPressureColor,
  getPressureLabel,
  Incident,
  Zone,
  LatLng,
} from '../types';
import { SAFETY_MARKERS } from '../data/safetyInfrastructure';

const VIT_CENTER: [number, number] = [12.8422, 80.155];
const DEFAULT_ZOOM = 17;

// ── Custom Leaflet divIcon factory ────────────────────────────────────────────
function makeDivIcon(emoji: string, size = 28): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      font-size:${size - 6}px;
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      background:rgba(15,20,40,0.85);
      border:1px solid rgba(255,255,255,0.18);
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeAssemblyIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      font-size:16px;
      width:34px;height:34px;
      display:flex;align-items:center;justify-content:center;
      background:rgba(34,197,94,0.15);
      border:2px solid #22C55E;
      border-radius:4px;
      box-shadow:0 2px 8px rgba(34,197,94,0.4);
      color:white;font-weight:bold;font-size:10px;
    ">🟢<br/><span style="font-size:6px;line-height:1">ASSM</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  interactive?: boolean;
  height?: string;
  onIncidentClick?: (inc: Incident) => void;
  highlightAssemblyZone?: string | null; // for lockdown — zoom to nearest assembly
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CampusMap({
  interactive = false,
  height = '400px',
  onIncidentClick,
}: Props) {
  const { state } = useStore();
  const zones = state.zones;

  return (
    <MapContainer
      center={VIT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height, width: '100%', borderRadius: '12px' }}
      dragging={interactive}
      zoomControl={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      keyboard={interactive}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* ── Zone polygons (pressure + building status + lockdown) ──────────── */}
      {zones.map((zone: Zone) => {
        const pressure = computeZonePressure(state.incidents, zone);
        const pressureColor = getPressureColor(pressure);
        const label = getPressureLabel(pressure);
        const pct = Math.round(pressure * 100);

        // Feature 9: building status overrides border color
        const borderColor =
          zone.buildingStatus !== 'clear'
            ? BUILDING_STATUS_COLORS[zone.buildingStatus]
            : pressureColor;

        const fillColor =
          zone.buildingStatus === 'do_not_enter'
            ? '#DC2626'
            : zone.buildingStatus === 'damaged'
            ? '#F59E0B'
            : pressureColor;

        const isLockdown = zone.isLockdown;

        return (
          <Polygon
            key={zone.id}
            positions={zone.polygon}
            pathOptions={{
              color: isLockdown ? '#DC2626' : borderColor,
              fillColor: isLockdown ? '#DC2626' : fillColor,
              fillOpacity: isLockdown ? 0.45 : 0.22,
              weight: isLockdown ? 3 : zone.buildingStatus !== 'clear' ? 3 : 2,
              dashArray:
                isLockdown
                  ? '4 4'
                  : zone.buildingStatus === 'do_not_enter'
                  ? '8 4'
                  : pressure > 0.6
                  ? '6 3'
                  : undefined,
            }}
          >
            {/* Compact permanent label — just the zone name + small pressure bar */}
            <Tooltip permanent direction="center" className="zone-label-compact">
              <div style={{
                textAlign: 'center',
                padding: '2px 8px',
                background: 'rgba(10,14,26,0.88)',
                borderRadius: 6,
                border: `1px solid ${isLockdown ? '#DC2626' : pressureColor}55`,
                boxShadow: `0 2px 8px rgba(0,0,0,0.5)`,
                minWidth: 64,
              }}>
                <div style={{ fontWeight: 700, fontSize: 9, color: '#fff', letterSpacing: '0.05em' }}>
                  {isLockdown ? '🔒 ' : ''}{zone.shortName}
                </div>
                {/* Tiny pressure bar */}
                <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 3 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pressureColor, borderRadius: 2, transition: 'width 0.5s ease' }} />
                </div>
                {pressure > 0.3 && (
                  <div style={{ fontSize: 8, color: pressureColor, fontWeight: 700, marginTop: 2 }}>
                    {pct}%
                  </div>
                )}
              </div>
            </Tooltip>
          </Polygon>
        );
      })}

      {/* ── Safety infrastructure markers (Feature 4) ─────────────────────── */}
      {SAFETY_MARKERS.map((sm) => (
        <Marker
          key={sm.id}
          position={[sm.lat, sm.lng]}
          icon={makeDivIcon(SAFETY_ITEM_ICONS[sm.type], 28)}
        >
          <Popup>
            <div style={{ fontSize: 12, minWidth: 160 }}>
              <strong>{SAFETY_ITEM_ICONS[sm.type]} {sm.type.replace('_', ' ').toUpperCase()}</strong>
              <br />
              <span style={{ color: '#9CA3AF' }}>{sm.locationLabel}</span>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* ── Assembly point markers (Feature 5) ────────────────────────────── */}
      {zones.map((zone: Zone) => (
        <Marker
          key={`assembly-${zone.id}`}
          position={[zone.assemblyPoint.lat, zone.assemblyPoint.lng]}
          icon={makeAssemblyIcon()}
        >
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong>🟢 Assembly Point</strong>
              <br />
              {zone.name}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* ── Incident dots with triage ring (Features 4, 6) ────────────────── */}
      {state.incidents
        .filter((i) => i.status !== 'archived')
        .map((inc: Incident) => {
          const baseColor = INCIDENT_COLORS[inc.type];
          const triageColor = inc.triageTag ? TRIAGE_COLORS[inc.triageTag] : null;
          const radius = inc.severity === 'critical' ? 10 : inc.severity === 'high' ? 8 : 6;

          return (
            <React.Fragment key={inc.id}>
              {/* Triage ring (outer) */}
              {triageColor && (
                <CircleMarker
                  center={[inc.location.lat, inc.location.lng]}
                  radius={radius + 5}
                  pathOptions={{
                    color: triageColor,
                    fillColor: 'transparent',
                    fillOpacity: 0,
                    weight: 3,
                    opacity: 0.9,
                  }}
                />
              )}
              {/* Main dot */}
              <CircleMarker
                center={[inc.location.lat, inc.location.lng]}
                radius={radius}
                pathOptions={{
                  color: baseColor,
                  fillColor: baseColor,
                  fillOpacity: inc.status === 'resolved' ? 0.3 : 0.85,
                  weight: 2,
                  className: inc.status === 'active' ? 'incident-pulse' : '',
                }}
                eventHandlers={
                  onIncidentClick ? { click: () => onIncidentClick(inc) } : {}
                }
              >
                <Tooltip>
                  <div style={{ fontSize: 12 }}>
                    <strong>{inc.type.toUpperCase()}</strong> — {inc.severity}
                    {inc.triageTag && (
                      <span style={{ color: triageColor ?? undefined, fontWeight: 700 }}>
                        {' '}[{inc.triageTag.toUpperCase()}]
                      </span>
                    )}
                    <br />
                    {inc.description}
                    <br />
                    <span style={{ opacity: 0.7 }}>
                      {new Date(inc.reportedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </Tooltip>
              </CircleMarker>

              {/* Contamination Rings (Feature 7) */}
              {inc.contaminationRadius && inc.status === 'active' && (
                <>
                  <Circle center={[inc.location.lat, inc.location.lng]} radius={inc.contaminationRadius} pathOptions={{ color: baseColor, weight: 1, fillOpacity: 0.1 }} />
                  <Circle center={[inc.location.lat, inc.location.lng]} radius={inc.contaminationRadius * 0.66} pathOptions={{ color: baseColor, weight: 1, fillOpacity: 0.15 }} />
                  <Circle center={[inc.location.lat, inc.location.lng]} radius={inc.contaminationRadius * 0.33} pathOptions={{ color: baseColor, weight: 2, fillOpacity: 0.25 }} />
                </>
              )}

              {/* Wind Direction Arrow (Feature 7) */}
              {inc.windDirection && inc.status === 'active' && (() => {
                const length = 0.0008; // Roughly 80-100m depending on lat
                let endLat = inc.location.lat;
                let endLng = inc.location.lng;
                
                if (inc.windDirection === 'N') endLat += length;
                if (inc.windDirection === 'S') endLat -= length;
                if (inc.windDirection === 'E') endLng += length;
                if (inc.windDirection === 'W') endLng -= length;

                return (
                  <Polyline
                    positions={[
                      [inc.location.lat, inc.location.lng],
                      [endLat, endLng],
                    ]}
                    pathOptions={{ color: '#9CA3AF', weight: 4, opacity: 0.8 }}
                  />
                );
              })()}

              {/* Assembly point path (Feature 5) — dashed line for active incidents (Fire Only) */}
              {inc.status === 'active' && inc.type === 'fire' && inc.zone && (() => {
                const zone = zones.find((z: Zone) => z.id === inc.zone);
                if (!zone) return null;
                const ap: LatLng = zone.assemblyPoint;
                return (
                  <Polyline
                    positions={[
                      [inc.location.lat, inc.location.lng],
                      [ap.lat, ap.lng],
                    ]}
                    pathOptions={{
                      color: '#DC2626', // Red for fire evacuation
                      weight: 3,
                      dashArray: '10, 15', // Make dashes look like arrows in CSS
                      opacity: 0.8,
                      className: 'evacuation-path', // We will animate this class in App.css
                    }}
                  />
                );
              })()}
            </React.Fragment>
          );
        })}
    </MapContainer>
  );
}
