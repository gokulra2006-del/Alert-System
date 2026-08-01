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
  const [isDraftingBroadcast, setIsDraftingBroadcast] = useState(false);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

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
      severity: 'critical',
      isEscalated: true,
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

  async function handleDraftBroadcast() {
    if (!broadcastText.trim()) return;
    setIsDraftingBroadcast(true);
    try {
      const res = await fetch('/api/ai/draft-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: broadcastText, type: broadcastType })
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcastText(data.draft);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDraftingBroadcast(false);
    }
  }

  async function handleGenerateSummary() {
    setIsGeneratingSummary(true);
    setShowSummaryModal(true);
    setAiSummary('');

    try {
      const activeData = activeIncidents.map(i => ({
        type: i.type,
        severity: i.severity,
        zone: i.zone,
        description: i.description
      }));
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentsData: activeData })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
      } else {
        setAiSummary('Failed to generate summary.');
      }
    } catch (e) {
      setAiSummary('Error connecting to AI service.');
    } finally {
      setIsGeneratingSummary(false);
    }
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
          className={`text-xs px-4 py-2 rounded-full font-bold border transition-all duration-300 ${
            selectedZone === 'all'
              ? 'bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md'
              : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-300'
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
              className={`text-xs px-4 py-2 rounded-full font-bold border transition-all duration-300 flex items-center gap-2 ${
                isSelected
                  ? 'backdrop-blur-md'
                  : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-300'
              }`}
              style={
                isSelected 
                  ? { background: `${color}15`, borderColor: `${color}40`, color: color, boxShadow: `0 0 20px ${color}20` }
                  : {}
              }
            >
              {zone.isLockdown && <span>🔒</span>}
              {zone.shortName}
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-extrabold tracking-wider"
                style={{ background: isSelected ? `${color}20` : 'rgba(255,255,255,0.05)', color: isSelected ? color : '#6b7280' }}
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
          <div className="flex flex-col gap-3">
            <h2 className="text-white font-extrabold text-lg flex items-center gap-2 tracking-tight flex-wrap">
              📋 Incidents
              {selectedZone !== 'all' && (
                <span className="text-indigo-400 font-semibold flex items-center gap-1.5">
                  <span className="text-gray-600">/</span> {state.zones.find(z => z.id === selectedZone)?.shortName}
                </span>
              )}
              <span className="text-[10px] bg-red-950/60 text-red-400 border border-red-900/50 px-2 py-1 rounded-md font-bold uppercase tracking-widest ml-auto shadow-[0_0_10px_rgba(220,38,38,0.2)] flex-shrink-0">
                {activeIncidents.length} active
              </span>
            </h2>
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleGenerateSummary}
                className="flex-1 justify-center text-xs px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-900/50 to-purple-900/50 text-indigo-300 border border-indigo-700/50 hover:border-indigo-400/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300 font-bold flex items-center gap-2 backdrop-blur-md"
              >
                <span className="text-sm">✨</span> AI Briefing
              </button>
              <button
                onClick={() => setShowBroadcastForm(!showBroadcastForm)}
                className="flex-1 justify-center text-xs px-3 py-2 rounded-xl bg-gradient-to-r from-amber-900/50 to-orange-900/50 text-amber-400 border border-amber-700/50 hover:border-amber-400/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all duration-300 font-bold flex items-center gap-2 backdrop-blur-md"
              >
                <span className="text-sm">📢</span> Broadcast
              </button>
            </div>
          </div>

          {/* Broadcast Form */}
          {showBroadcastForm && (
            <div className="bg-gray-900/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_0_40px_rgba(245,158,11,0.15)] animate-fade-in-down relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-400">📢</span>
                <span className="text-xs font-bold text-amber-100 uppercase tracking-widest">New Broadcast</span>
              </div>
              <div className="flex gap-2">
                {(['info', 'warning', 'critical'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBroadcastType(t)}
                    className={`flex-1 text-[10px] py-1.5 rounded-xl border capitalize font-extrabold tracking-wider transition-all duration-300 ${
                      broadcastType === t
                        ? t === 'critical' ? 'bg-red-900/80 border-red-500 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                        : t === 'warning' ? 'bg-amber-900/80 border-amber-500 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-blue-900/80 border-blue-500 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                        : 'bg-gray-800/50 border-gray-700/50 text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-0 group-focus-within:opacity-30 transition duration-500"></div>
                <textarea
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Message to students... (or type a rough prompt and click Draft with AI)"
                  rows={3}
                  className="relative w-full bg-black/40 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 placeholder-gray-600 resize-none shadow-inner"
                />
              </div>

              <div className="flex justify-between items-center px-1">
                <button 
                  onClick={handleDraftBroadcast} 
                  disabled={isDraftingBroadcast || !broadcastText.trim()}
                  className="group relative overflow-hidden text-xs text-white font-bold px-4 py-1.5 rounded-lg disabled:opacity-50 transition-all duration-300 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:scale-105"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {isDraftingBroadcast ? (
                    <span className="flex items-center gap-2"><span className="animate-spin text-sm">⏳</span> Drafting...</span>
                  ) : (
                    <span className="flex items-center gap-2"><span className="text-sm">✨</span> Draft with AI</span>
                  )}
                </button>
                <span className="text-[10px] font-mono text-gray-500 bg-black/40 px-2 py-0.5 rounded-md border border-gray-800">{broadcastText.length}/160</span>
              </div>

              <div className="flex gap-3 mt-1">
                <button
                  onClick={() => setShowBroadcastForm(false)}
                  className="flex-1 py-2.5 bg-gray-800/50 hover:bg-gray-700/80 text-gray-300 font-bold rounded-xl text-xs transition-all duration-300 border border-gray-700/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBroadcast}
                  disabled={!broadcastText.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 disabled:from-gray-800 disabled:to-gray-800 text-white font-bold rounded-xl text-xs transition-all duration-300 shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.5)] transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  📤 Send Broadcast
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
      {/* AI Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[200] bg-[#0a0e1a]/90 flex items-center justify-center backdrop-blur-xl px-4 transition-all duration-500">
          <div className="bg-gradient-to-b from-indigo-950/40 to-[#0a0e1a] border border-indigo-500/40 rounded-3xl p-8 max-w-2xl w-full shadow-[0_0_60px_rgba(99,102,241,0.2)] animate-fade-in-up relative overflow-hidden">
            
            {/* Decorative background glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-indigo-500/20 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <h3 className="text-white font-black text-xl tracking-tight">AI Situation Briefing</h3>
                  <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Campus Command Center</p>
                </div>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-white/10"
              >
                ✕
              </button>
            </div>
            
            <div className="min-h-[150px] flex flex-col justify-center relative z-10">
              {isGeneratingSummary ? (
                <div className="flex flex-col items-center gap-4 py-8 text-indigo-400">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full border-t-2 border-indigo-400 animate-spin" />
                    <div className="w-12 h-12 rounded-full border border-indigo-500/20 flex items-center justify-center text-lg">🤖</div>
                  </div>
                  <span className="text-sm font-bold animate-pulse tracking-wide">Synthesizing live incident data...</span>
                </div>
              ) : (
                <div className="bg-black/40 border border-indigo-900/50 rounded-2xl p-6 shadow-inner relative group">
                  <div className="absolute top-0 left-4 w-12 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-b-lg" />
                  <p className="text-gray-200 text-sm leading-relaxed font-medium">
                    {aiSummary}
                  </p>
                </div>
              )}
            </div>
            
            {!isGeneratingSummary && (
              <div className="mt-6 flex justify-end relative z-10">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5"
                >
                  Acknowledge
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
