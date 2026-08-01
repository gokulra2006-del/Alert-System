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
import LoginOverlay from './LoginOverlay';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  if (!isAuthenticated) {
    return <LoginOverlay onLogin={() => setIsAuthenticated(true)} />;
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
          className="group w-full py-4 bg-gradient-to-r from-gray-900/90 to-gray-800/90 hover:from-gray-800 hover:to-gray-700 
            border border-gray-700/50 hover:border-gray-400/50
            text-gray-200 font-semibold rounded-2xl transition-all duration-300 ease-out text-sm
            flex items-center justify-center gap-3 backdrop-blur-md shadow-lg shadow-black/40 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="text-lg group-hover:scale-110 transition-transform duration-300">📝</span>
          <span className="tracking-wide">Report Something Else</span>
          <span className="text-gray-500 text-xs ml-1 font-medium bg-black/40 px-2 py-0.5 rounded-full border border-gray-800">
            Hazmat / Other
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
          <div className="bg-[#0a0e1a]/80 backdrop-blur-xl border border-blue-900/30 rounded-2xl p-4 shadow-2xl shadow-blue-900/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-blue-400 font-extrabold uppercase tracking-widest flex items-center gap-2">
                <span className="stat-blink w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                Live HUD
              </p>
              <span className="text-[10px] bg-blue-950/50 text-blue-300 px-2 py-1 rounded-md border border-blue-800/50 font-bold">{activeCount} ACTIVE</span>
            </div>
            <div className="flex flex-col gap-2">
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
