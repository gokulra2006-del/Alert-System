import React, { useState } from 'react';
import { useStore } from '../store';
import {
  computeZonePressure,
  getPressureColor,
  getPressureLabel,
  ZoneId,
  generateId,
  BroadcastMessage,
} from '../types';
import CampusMap from '../components/CampusMap';
import IncidentCard from '../components/IncidentCard';
import AlertBanner from '../components/AlertBanner';
import LockdownBanner from '../components/student/LockdownBanner';

export default function WardenView() {
  const { state, updateIncident, resolveIncident, addBroadcast } = useStore();
  const [selectedZone, setSelectedZone] = useState<ZoneId | 'all'>('all');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'critical'>('info');
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);

  const lockedZones = state.zones.filter((z) => z.isLockdown);

  const filteredIncidents = state.incidents.filter((inc) =>
    selectedZone === 'all' ? true : inc.zone === selectedZone
  );

  const activeIncidents = filteredIncidents.filter((i) =>
    ['active', 'acknowledged'].includes(i.status)
  );
  const resolvedIncidents = filteredIncidents.filter((i) => i.status === 'resolved');

  const totalActive = state.incidents.filter(i =>
    ['active', 'acknowledged'].includes(i.status)
  ).length;
  const criticalCount = state.incidents.filter(i =>
    i.severity === 'critical' && ['active', 'acknowledged'].includes(i.status)
  ).length;

  function handleAcknowledge(id: string) {
    updateIncident(id, {
      status: 'acknowledged',
      acknowledgedBy: 'Warden',
      responseStartTime: Date.now(),
    });
  }

  function handleResolve(id: string) {
    resolveIncident(id);
  }

  function handleEscalate(id: string) {
    updateIncident(id, {
      status: 'active',
      notes: 'Escalated by Warden — requires Admin attention',
      acknowledgedBy: 'Warden',
    });
  }

  function handleBroadcast() {
    if (!broadcastText.trim()) return;
    const msg: BroadcastMessage = {
      id: generateId(),
      text: broadcastText.trim(),
      sender: 'Warden',
      sentAt: Date.now(),
      targetZone: selectedZone,
      type: broadcastType,
    };
    addBroadcast(msg);
    setBroadcastText('');
    setShowBroadcastForm(false);
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a]">
      <LockdownBanner lockedZones={lockedZones} />

      {state.broadcasts.length > 0 && (
        <div className="px-4 pt-3">
          <AlertBanner broadcasts={state.broadcasts} />
        </div>
      )}

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 flex gap-3 flex-wrap">
        {[
          { label: 'Active', value: totalActive, color: '#DC2626', icon: '🔴' },
          { label: 'Critical', value: criticalCount, color: '#F97316', icon: '⚠️' },
          { label: 'Zones', value: state.zones.length, color: '#6366F1', icon: '📍' },
          { label: 'Resolved Today', value: state.incidents.filter(i => i.status === 'resolved').length, color: '#22C55E', icon: '✅' },
        ].map(stat => (
          <div
            key={stat.label}
            className="flex items-center gap-2.5 bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl px-4 py-2.5 flex-1 min-w-[100px] shadow-lg"
            style={{ 
              borderLeft: `3px solid ${stat.color}`,
              background: `linear-gradient(135deg, rgba(17,24,39,0.5) 0%, rgba(31,41,55,0.7) 100%)`
            }}
          >
            <span className="text-lg">{stat.icon}</span>
            <div>
              <div className="text-xl font-black text-white leading-none">{stat.value}</div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Zone Filter Pills ──────────────────────────────────────────────── */}
      <div className="px-4 py-2 flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedZone('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
            selectedZone === 'all'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]'
              : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
          }`}
        >
          All Zones
        </button>
        {state.zones.map((zone) => {
          const pressure = computeZonePressure(state.incidents, zone);
          const color = getPressureColor(pressure);
          const isSelected = selectedZone === zone.id;
          return (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(selectedZone === zone.id ? 'all' : zone.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
              }`}
              style={isSelected ? { background: color, borderColor: color, boxShadow: `0 0 10px ${color}50` } : {}}
            >
              {zone.isLockdown && <span>🔒</span>}
              {zone.shortName}
              <span
                className="text-[10px] px-1 rounded-full font-bold"
                style={{ background: isSelected ? 'rgba(0,0,0,0.25)' : `${color}20`, color }}
              >
                {Math.round(pressure * 100)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main Two-Column Layout ─────────────────────────────────────────── */}
      <div className="flex-1 px-4 pb-6 grid lg:grid-cols-[1fr_380px] gap-4 mt-2 min-h-0">

        {/* LEFT — Map (contained, no overflow) */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              🗺️ Live Campus Map
              <span className="text-xs text-gray-500 font-normal">Safety markers + assembly points</span>
            </h2>
          </div>

          {/* Map container with explicit isolation to prevent z-index bleed */}
          <div
            className="rounded-xl overflow-hidden ring-1 ring-gray-700 shadow-2xl"
            style={{ isolation: 'isolate', height: '380px', position: 'relative', zIndex: 0 }}
          >
            <CampusMap height="380px" interactive={true} />
          </div>

          {/* Zone Pressure Cards */}
          <div>
            <h3 className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-2">Zone Pressure</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {state.zones.map((zone) => {
                const pressure = computeZonePressure(state.incidents, zone);
                const color = getPressureColor(pressure);
                const label = getPressureLabel(pressure);
                const pct = Math.round(pressure * 100);
                const zoneActive = state.incidents.filter(
                  (i) => i.zone === zone.id && i.status === 'active'
                ).length;

                return (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZone(selectedZone === zone.id ? 'all' : zone.id)}
                    className={`relative bg-gray-900 border rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-100 ${
                      selectedZone === zone.id
                        ? 'border-indigo-500 ring-1 ring-indigo-500/40'
                        : 'border-gray-800 hover:border-gray-600'
                    }`}
                    style={{ boxShadow: pressure > 0.6 ? `0 0 16px ${color}25` : undefined }}
                  >
                    {zone.isLockdown && (
                      <span className="absolute -top-1.5 -right-1.5 text-xs bg-red-700 border border-red-500 text-white rounded-full px-1.5 py-0.5">
                        🔒
                      </span>
                    )}
                    {pressure > 0.85 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-900 animate-pulse block" />
                    )}
                    <div className="text-xs text-gray-400 font-medium mb-1.5">{zone.shortName}</div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold" style={{ color }}>{label}</span>
                      <span className="text-xs text-gray-500">{zoneActive} active</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Incident Panel */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              📋 Incidents
              {selectedZone !== 'all' && (
                <span className="text-indigo-400 font-normal">
                  · {state.zones.find(z => z.id === selectedZone)?.shortName}
                </span>
              )}
              <span className="text-xs bg-red-900/40 text-red-300 border border-red-900/50 px-1.5 py-0.5 rounded-full font-bold">
                {activeIncidents.length} active
              </span>
            </h2>
            <button
              onClick={() => setShowBroadcastForm(!showBroadcastForm)}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-900/40 text-amber-400 border border-amber-800 hover:bg-amber-900/60 transition-colors font-semibold flex items-center gap-1.5"
            >
              📢 Broadcast
            </button>
          </div>

          {/* Broadcast Form */}
          {showBroadcastForm && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex gap-2">
                {(['info', 'warning', 'critical'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBroadcastType(t)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border capitalize font-semibold transition-colors ${
                      broadcastType === t
                        ? t === 'critical' ? 'bg-red-700 border-red-500 text-white'
                        : t === 'warning' ? 'bg-amber-700 border-amber-500 text-white'
                        : 'bg-blue-700 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <textarea
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Message to students..."
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBroadcastForm(false)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 font-medium rounded-lg text-sm transition-colors border border-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBroadcast}
                  disabled={!broadcastText.trim()}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Incidents List */}
          <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5" style={{ maxHeight: '600px' }}>
            {activeIncidents.length === 0 ? (
              <div className="text-center py-16 text-gray-600 flex flex-col items-center gap-3">
                <span className="text-5xl">✅</span>
                <p className="text-sm font-medium">No active incidents</p>
                <p className="text-xs text-gray-700">
                  {selectedZone !== 'all' ? 'No issues in this zone.' : 'All clear!'}
                </p>
              </div>
            ) : (
              activeIncidents.map((inc) => (
                <IncidentCard
                  key={inc.id}
                  incident={inc}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onEscalate={handleEscalate}
                  showResourceButtons
                  showTriageTags
                />
              ))
            )}

            {/* Resolved section */}
            {resolvedIncidents.length > 0 && (
              <details className="text-sm mt-2">
                <summary className="text-gray-600 cursor-pointer hover:text-gray-400 text-xs font-medium py-2 flex items-center gap-2">
                  <span className="text-green-700">✓</span>
                  {resolvedIncidents.length} resolved incident{resolvedIncidents.length > 1 ? 's' : ''}
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  {resolvedIncidents.map((inc) => (
                    <IncidentCard key={inc.id} incident={inc} compact />
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
