import React, { useState, useCallback } from 'react';
import { useStore } from '../store';
import { useGPS } from '../hooks/useGPS';
import {
  Incident,
  IncidentType,
  generateId,
  getZoneForLocation,
  Severity,
} from '../types';
import CampusMap from '../components/CampusMap';
import SilentSOS from '../components/SilentSOS';
import ReportDrawer from '../components/ReportDrawer';
import AlertBanner from '../components/AlertBanner';

type ButtonState = 'idle' | 'loading' | 'success';

interface EmergencyButtonConfig {
  type: IncidentType;
  icon: string;
  label: string;
  bg: string;
  glow: string;
}

const EMERGENCY_BUTTONS: EmergencyButtonConfig[] = [
  {
    type: 'fire',
    icon: '🔥',
    label: 'FIRE',
    bg: '#DC2626',
    glow: 'rgba(220,38,38,0.4)',
  },
  {
    type: 'medical',
    icon: '🏥',
    label: 'MEDICAL',
    bg: '#2563EB',
    glow: 'rgba(37,99,235,0.4)',
  },
  {
    type: 'security',
    icon: '🛡',
    label: 'SECURITY',
    bg: '#D97706',
    glow: 'rgba(217,119,6,0.4)',
  },
];

export default function StudentView() {
  const { state, addIncident, addCheckIn } = useStore();
  const { getLocation } = useGPS();

  const [buttonStates, setButtonStates] = useState<
    Record<IncidentType, ButtonState>
  >({ fire: 'idle', medical: 'idle', security: 'idle', other: 'idle', hazmat: 'idle', elevator: 'idle' });

  const [pulsingBtn, setPulsingBtn] = useState<IncidentType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkedInRequestIds, setCheckedInRequestIds] = useState<Set<string>>(new Set());

  const handleCheckIn = (reqId: string) => {
    if (!state.currentUser || !state.currentUser.zone) return;
    addCheckIn({
      id: generateId(),
      userId: state.currentUser.id,
      zoneId: state.currentUser.zone,
      timestamp: Date.now()
    });
    setCheckedInRequestIds(prev => new Set(prev).add(reqId));
  };

  const handleEmergency = useCallback(
    async (type: IncidentType) => {
      if (buttonStates[type] !== 'idle') return;

      // Start loading
      setButtonStates((prev) => ({ ...prev, [type]: 'loading' }));

      const loc = await getLocation();
      const zone = getZoneForLocation(loc);

      const severityMap: Record<IncidentType, Severity> = {
        fire: 'critical',
        medical: 'critical',
        security: 'high',
        other: 'medium',
        hazmat: 'critical',
        elevator: 'high',
      };

      const descMap: Record<IncidentType, string> = {
        fire: 'Fire emergency — one-tap dispatch from student',
        medical: 'Medical emergency — one-tap dispatch from student',
        security: 'Security alert — one-tap dispatch from student',
        other: 'Incident reported by student',
        hazmat: 'Hazmat incident reported',
        elevator: 'Elevator emergency reported',
      };

      const incident: Incident = {
        id: generateId(),
        type,
        severity: severityMap[type],
        status: 'active',
        zone,
        location: loc,
        description: descMap[type],
        reportedBy: 'Student',
        reportedAt: Date.now(),
        updatedAt: Date.now(),
      };

      addIncident(incident);

      // Success state + ring pulse
      setButtonStates((prev) => ({ ...prev, [type]: 'success' }));
      setPulsingBtn(type);

      setTimeout(() => {
        setButtonStates((prev) => ({ ...prev, [type]: 'idle' }));
        setPulsingBtn(null);
      }, 3000);
    },
    [buttonStates, getLocation, addIncident]
  );

  const activeCount = state.incidents.filter((i) => i.status === 'active').length;

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a]">
      {/* Title Bar */}
      <header className="bg-gray-900/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-red-500 text-xl">🚨</span>
          <span className="font-bold text-white text-sm tracking-tight">
            Campus Command Center
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="stat-blink flex items-center gap-1 bg-red-900/50 border border-red-700 text-red-300 text-xs font-semibold px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
              {activeCount} Active
            </span>
          )}
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
            Student
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-4 p-4 pb-28 max-w-lg mx-auto w-full">
        {/* Broadcasts */}
        {state.broadcasts.length > 0 && (
          <AlertBanner broadcasts={state.broadcasts} />
        )}

        {/* Check-In Requests */}
        {state.checkInRequests.filter(r => !checkedInRequestIds.has(r.id)).map(req => (
          <div key={req.id} className="bg-amber-950/80 border border-amber-500/50 rounded-xl p-4 animate-fade-in-up">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠</span>
              <div className="flex-1">
                <h3 className="text-amber-400 font-bold text-sm">Safety Check-In Requested</h3>
                <p className="text-amber-200/80 text-xs mt-1 leading-relaxed">
                  Campus administration has requested a safety check-in for your zone. Please confirm you are safe.
                </p>
                <button
                  onClick={() => handleCheckIn(req.id)}
                  className="mt-3 w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold py-2 rounded-lg transition-colors"
                >
                  I'm Safe
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Emergency heading */}
        <div>
          <h1 className="text-white font-bold text-xl tracking-tight">
            Emergency Response
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Tap once to instantly alert campus authorities
          </p>
        </div>

        {/* Emergency Buttons Grid */}
        <div className="grid grid-cols-2 gap-3">
          {EMERGENCY_BUTTONS.map((btn) => {
            const bState = buttonStates[btn.type];
            const isPulsing = pulsingBtn === btn.type;

            return (
              <button
                key={btn.type}
                onClick={() => handleEmergency(btn.type)}
                disabled={bState !== 'idle'}
                className={`
                  relative flex flex-col items-center justify-center gap-2
                  min-h-[88px] rounded-2xl font-semibold text-white
                  transition-all duration-150 select-none
                  active:scale-95 disabled:cursor-default
                  ${btn.type === 'security' ? 'col-span-2 md:col-span-1' : ''}
                  ${isPulsing ? 'ring-pulse' : ''}
                `}
                style={{
                  background:
                    bState === 'success'
                      ? 'linear-gradient(135deg, #16a34a, #15803d)'
                      : bState === 'loading'
                      ? `${btn.bg}99`
                      : `linear-gradient(135deg, ${btn.bg}, ${btn.bg}cc)`,
                  boxShadow:
                    bState === 'idle'
                      ? `0 4px 20px ${btn.glow}, inset 0 1px 0 rgba(255,255,255,0.15)`
                      : 'none',
                }}
              >
                <span className="text-3xl leading-none">
                  {bState === 'success' ? '✓' : btn.icon}
                </span>
                <span className="text-[15px] font-bold tracking-wide">
                  {bState === 'success'
                    ? 'Reported ✓'
                    : bState === 'loading'
                    ? 'Sending…'
                    : btn.label}
                </span>
                {bState === 'idle' && (
                  <span className="text-[10px] text-white/60 font-normal">
                    Tap to dispatch
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Report Something Else */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-full py-3.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 font-medium rounded-xl transition-all text-sm flex items-center justify-center gap-2"
        >
          <span>📝</span>
          Report Something Else
        </button>

        {/* Live Map */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-semibold text-sm">
              🗺️ Live Campus Map
            </h2>
            <span className="text-xs text-gray-500">Read-only view</span>
          </div>
          <div 
            className="rounded-xl overflow-hidden ring-1 ring-gray-700 relative"
            style={{ isolation: 'isolate' }}
          >
            <CampusMap height="300px" interactive={false} />
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-2 flex-wrap">
            {[
              ['🔥', 'Fire', '#DC2626'],
              ['🏥', 'Medical', '#2563EB'],
              ['🛡️', 'Security', '#D97706'],
              ['⚠️', 'Other', '#7C3AED'],
            ].map(([icon, label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: color as string }}
                />
                <span className="text-xs text-gray-400">
                  {icon} {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent incidents preview */}
        {state.incidents.filter((i) => i.status === 'active').length > 0 && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
              Active on Campus
            </p>
            <div className="flex flex-col gap-1.5">
              {state.incidents
                .filter((i) => i.status === 'active')
                .slice(0, 3)
                .map((inc) => (
                  <div
                    key={inc.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background:
                          inc.type === 'fire'
                            ? '#DC2626'
                            : inc.type === 'medical'
                            ? '#2563EB'
                            : inc.type === 'security'
                            ? '#D97706'
                            : '#7C3AED',
                      }}
                    />
                    <span className="text-gray-300 truncate">
                      {inc.description}
                    </span>
                    <span className="text-gray-600 ml-auto flex-shrink-0 capitalize">
                      {inc.zone}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      <ReportDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <SilentSOS />
    </div>
  );
}
