import React, { useState } from 'react';
import { useStore } from '../../store';
import CampusMap from '../CampusMap';
import AlertBanner from '../AlertBanner';
import EmergencyButton, {
  EmergencyButtonConfig,
} from './EmergencyButton';
import SilentSOS from './SilentSOS';
import ReportDrawer from './ReportDrawer';
import LockdownBanner from './LockdownBanner';
import ActiveEmergencyView from './ActiveEmergencyView';
import { IncidentType } from '../../types';

// ── Button configs ────────────────────────────────────────────────────────────
const BUTTONS: EmergencyButtonConfig[] = [
  {
    type: 'fire',
    icon: '🔥',
    label: 'FIRE',
    bg: '#DC2626',
    glow: 'rgba(220,38,38,0.45)',
    severity: 'critical',
    description: 'Fire emergency — one-tap dispatch from student',
  },
  {
    type: 'medical',
    icon: '🏥',
    label: 'MEDICAL',
    bg: '#2563EB',
    glow: 'rgba(37,99,235,0.45)',
    severity: 'critical',
    description: 'Medical emergency — one-tap dispatch from student',
  },
  {
    type: 'security',
    icon: '🛡',
    label: 'SECURITY',
    bg: '#D97706',
    glow: 'rgba(217,119,6,0.45)',
    severity: 'high',
    description: 'Security alert — one-tap dispatch from student',
    fullWidth: true,             // spans full row on mobile
  },
];

export default function StudentView() {
  const { state } = useStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [activeIncidentType, setActiveIncidentType] = useState<IncidentType | null>(null);

  const activeCount = state.incidents.filter((i) => i.status === 'active').length;

  const lockedZones = state.zones.filter((z) => z.isLockdown);

  if (activeIncidentId && activeIncidentType) {
    return (
      <ActiveEmergencyView 
        incidentId={activeIncidentId} 
        type={activeIncidentType}
        onResolve={() => {
          setActiveIncidentId(null);
          setActiveIncidentType(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a]">
      <LockdownBanner lockedZones={lockedZones} />

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col gap-5 px-4 pt-5 pb-28
        max-w-lg mx-auto w-full">

        {/* Broadcast banner */}
        {state.broadcasts.length > 0 && (
          <AlertBanner broadcasts={state.broadcasts} />
        )}

        {/* Section heading */}
        <div>
          <h1 className="text-white font-extrabold text-2xl tracking-tight">
            Emergency Response
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            One tap instantly alerts campus authorities
          </p>
        </div>

        {/* ── TIER 1 — One-tap Emergency Grid ──────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {BUTTONS.map((cfg) => (
            <EmergencyButton 
              key={cfg.type} 
              config={cfg} 
              onDispatch={(id) => {
                setActiveIncidentId(id);
                setActiveIncidentType(cfg.type);
              }}
            />
          ))}
        </div>

        {/* ── TIER 3 trigger ── Report Something Else ──────────────────────── */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-full py-3.5 bg-gray-800/80 hover:bg-gray-700/80
            border border-gray-700 hover:border-gray-500
            text-gray-300 font-medium rounded-xl transition-all text-sm
            flex items-center justify-center gap-2"
        >
          <span>📝</span>
          Report Something Else
          <span className="text-gray-600 text-xs ml-1">
            (Hazmat / Other)
          </span>
        </button>

        {/* ── Live map — read-only ──────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-semibold text-sm">
              🗺️ Live Campus Map
            </h2>
            <span className="text-xs text-gray-600">Read-only</span>
          </div>

          <div className="rounded-xl overflow-hidden ring-1 ring-gray-800">
            <CampusMap height="280px" interactive={false} />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {(
              [
                ['#DC2626', '🔥 Fire'],
                ['#2563EB', '🏥 Medical'],
                ['#D97706', '🛡️ Security'],
                ['#10B981', '☢️ Hazmat'],
                ['#7C3AED', '⚠️ Other'],
              ] as [string, string][]
            ).map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active incidents preview */}
        {activeCount > 0 && (
          <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-3">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">
              Currently Active
            </p>
            <div className="flex flex-col gap-1.5">
              {state.incidents
                .filter((i) => i.status === 'active')
                .slice(0, 4)
                .map((inc) => (
                  <div key={inc.id} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background:
                          inc.type === 'fire'    ? '#DC2626'
                          : inc.type === 'medical'  ? '#2563EB'
                          : inc.type === 'security' ? '#D97706'
                          : inc.type === 'hazmat'   ? '#10B981'
                          : '#7C3AED',
                      }}
                    />
                    <span className="text-gray-300 truncate flex-1">
                      {inc.description}
                    </span>
                    <span className="text-gray-600 flex-shrink-0 capitalize">
                      {inc.zone}
                    </span>
                  </div>
                ))}
              {activeCount > 4 && (
                <p className="text-xs text-gray-600 mt-0.5">
                  +{activeCount - 4} more…
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── TIER 3 — Report Drawer ────────────────────────────────────────── */}
      <ReportDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* ── TIER 2 — Silent SOS ──────────────────────────────────────────── */}
      <SilentSOS />
    </div>
  );
}
