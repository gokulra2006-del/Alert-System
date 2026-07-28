import React, { useState } from 'react';
import { useStore } from '../store';
import {
  ZONES,
  computeZonePressure,
  getPressureColor,
  getPressureLabel,
  Incident,
  IncidentType,
  Severity,
  ZoneId,
  BuildingStatus,
  generateId,
  INCIDENT_COLORS,
  BroadcastMessage,
  BUILDING_STATUS_COLORS,
} from '../types';
import CampusMap from '../components/CampusMap';
import IncidentCard from '../components/IncidentCard';
import AlertBanner from '../components/AlertBanner';
import SafeCheckPanel from '../components/admin/SafeCheckPanel';

const TYPE_ICONS: Record<IncidentType, string> = {
  fire: '🔥',
  medical: '🏥',
  security: '🛡️',
  hazmat: '☢️',
  other: '⚠️',
  elevator: '🛗',
};

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  color: string;
  sub?: string;
}) {
  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-1 transition-all hover:bg-gray-800/80"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="text-3xl font-black" style={{ color }}>
        {value}
      </div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </div>
      {sub && <div className="text-xs text-gray-600">{sub}</div>}
    </div>
  );
}

export default function AdminView() {
  const { state, updateIncident, resolveIncident, addIncident, addBroadcast, setBuildingStatus, addCheckInRequest } =
    useStore();

  const [filter, setFilter] = useState<'all' | IncidentType>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'critical'>('warning');

  // Multi-select for merging
  const [selectedIncidents, setSelectedIncidents] = useState<Set<string>>(new Set());

  // Create incident form state
  const [newType, setNewType] = useState<IncidentType>('other');
  const [newSev, setNewSev] = useState<Severity>('medium');
  const [newZone, setNewZone] = useState<ZoneId>('north');
  const [newDesc, setNewDesc] = useState('');

  // AI Summary state
  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  async function handleGenerateSummary() {
    setIsGeneratingSummary(true);
    setShowSummaryModal(true);
    setAiSummary('');

    try {
      const activeData = state.incidents.filter(i => i.status === 'active').map(i => ({
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
        throw new Error('API down');
      }
    } catch {
      // Mock fallback if API not wired up
      await new Promise(r => setTimeout(r, 1200));
      const critical = state.incidents.filter(i => i.severity === 'critical' && i.status === 'active').length;
      setAiSummary(`Chief, we currently have ${state.incidents.filter(i => i.status === 'active').length} active incidents on campus. ${critical > 0 ? `There are ${critical} critical situations requiring immediate tactical coordination.` : 'All situations are currently contained and response teams are deployed.'} Ensure all wardens remain on high alert.`);
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  // Exclude merged children from high-level counts
  const visibleIncidents = state.incidents.filter(i => !i.isMerged);

  const allActive = visibleIncidents.filter((i) =>
    ['active', 'acknowledged'].includes(i.status)
  );
  const allResolved = visibleIncidents.filter((i) => i.status === 'resolved');

  const byType = (['fire', 'medical', 'security', 'hazmat', 'elevator', 'other'] as IncidentType[]).map(
    (t) => ({
      type: t,
      count: visibleIncidents.filter((i) => i.type === t && i.status === 'active').length,
    })
  ).filter(t => t.count > 0);

  const criticalCount = visibleIncidents.filter(
    (i) => i.severity === 'critical' && i.status === 'active'
  ).length;

  const filteredIncidents =
    filter === 'all'
      ? visibleIncidents
      : visibleIncidents.filter((i) => i.type === filter);

  function handleBroadcast() {
    if (!broadcastText.trim()) return;
    const msg: BroadcastMessage = {
      id: generateId(),
      text: broadcastText.trim(),
      sender: 'Admin',
      sentAt: Date.now(),
      targetZone: 'all',
      type: broadcastType,
    };
    addBroadcast(msg);
    setBroadcastText('');
  }

  function handleCreateIncident() {
    if (!newDesc.trim()) return;
    const zone = ZONES.find((z) => z.id === newZone)!;
    const poly = zone.polygon;
    const lats = poly.map((p) => p[0]);
    const lngs = poly.map((p) => p[1]);
    const loc = {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };

    const incident: Incident = {
      id: generateId(),
      type: newType,
      severity: newSev,
      status: 'active',
      zone: newZone,
      location: loc,
      description: newDesc.trim(),
      reportedBy: 'Admin',
      reportedAt: Date.now(),
      updatedAt: Date.now(),
    };

    addIncident(incident);
    setNewDesc('');
    setShowCreateForm(false);
  }

  function toggleSelection(id: string) {
    const next = new Set(selectedIncidents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIncidents(next);
  }

  function handleMerge() {
    if (selectedIncidents.size < 2) return;
    const children = visibleIncidents.filter(i => selectedIncidents.has(i.id));
    
    // Create parent mass casualty incident
    const parentId = generateId();
    addIncident({
      id: parentId,
      type: 'medical', // Typically MCI is medical/multidisciplinary
      severity: 'critical',
      status: 'active',
      zone: children[0].zone, // rough guess, take first zone
      location: children[0].location,
      description: `Mass Casualty Incident (Merged from ${children.length} reports)`,
      reportedBy: 'Admin (System)',
      reportedAt: Date.now(),
      updatedAt: Date.now(),
      subIncidents: Array.from(selectedIncidents),
    });

    // Hide children
    Array.from(selectedIncidents).forEach(childId => {
      updateIncident(childId, { isMerged: true });
    });

    setSelectedIncidents(new Set());
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a] pt-4">

      <main className="flex-1 p-4 flex flex-col gap-5 max-w-6xl mx-auto w-full mb-10 animate-fade-in-up">
        {/* Broadcasts */}
        {state.broadcasts.length > 0 && (
          <AlertBanner broadcasts={state.broadcasts} />
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-semibold text-lg">System Overview</h2>
          <button
            onClick={handleGenerateSummary}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all active:scale-95"
          >
            <span>✨</span> Generate AI Briefing
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Incidents"
            value={allActive.length}
            color="#DC2626"
            sub={`${criticalCount} critical`}
          />
          <StatCard
            label="Resolved Today"
            value={allResolved.length}
            color="#22C55E"
          />
          <StatCard
            label="SOS Alerts"
            value={
              visibleIncidents.filter((i) => i.isSOS && i.status === 'active').length
            }
            color="#F97316"
            sub="Require immediate attention"
          />
          <StatCard
            label="Total Reports"
            value={visibleIncidents.length}
            color="#818CF8"
          />
        </div>



        {/* Check-In Panel */}
        <SafeCheckPanel />

        {/* Zone Pressure + Map Row */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Zone pressure column */}
          <div className="flex flex-col gap-4">
            <h2 className="text-white font-semibold text-sm uppercase tracking-widest opacity-60 px-1">
              Zone Status & Controls
            </h2>
            {ZONES.map((zone) => {
              const pressure = computeZonePressure(visibleIncidents, zone);
              const color = getPressureColor(pressure);
              const label = getPressureLabel(pressure);
              const pct = Math.round(pressure * 100);
              
              const systemZone = state.zones.find(z => z.id === zone.id)!;
              const zoneActive = visibleIncidents.filter(
                (i) => i.zone === zone.id && i.status === 'active'
              ).length;

              return (
                <div
                  key={zone.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 transition-all hover:bg-gray-800/50"
                  style={{
                    boxShadow: pressure > 0.6 ? `0 0 20px ${color}15` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-200">
                      {zone.shortName}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded shadow-sm"
                      style={{ color, background: `${color}22` }}
                    >
                      {label}
                    </span>
                  </div>
                  
                  {/* Pressure bar */}
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{pct}% capacity</span>
                    <span>{zoneActive} active</span>
                  </div>

                  {/* Building Status Toggles */}
                  <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
                    {(['clear', 'damaged', 'do_not_enter'] as BuildingStatus[]).map(status => {
                      const isActive = systemZone.buildingStatus === status;
                      const statusColor = BUILDING_STATUS_COLORS[status];
                      return (
                        <button
                          key={status}
                          onClick={() => setBuildingStatus(zone.id, status)}
                          className={`flex-1 text-[10px] uppercase font-bold py-1.5 rounded transition-colors ${
                            isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                          }`}
                          style={{
                            background: isActive ? statusColor : 'transparent',
                            boxShadow: isActive ? `0 2px 8px ${statusColor}40` : 'none'
                          }}
                        >
                          {status.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Feature 2: Push Check-In Request */}
                  <button
                    onClick={() => {
                      addCheckInRequest({
                        id: generateId(),
                        zoneId: zone.id,
                        timestamp: Date.now(),
                        requestedBy: 'Admin'
                      });
                    }}
                    className="mt-3 w-full text-xs font-bold text-amber-400 bg-amber-950/30 border border-amber-900/50 hover:bg-amber-900/50 transition-colors py-1.5 rounded-lg"
                  >
                    ⚠ Request Safety Check
                  </button>
                </div>
              );
            })}
          </div>

          {/* Map */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-white font-semibold text-sm uppercase tracking-widest opacity-60 px-1">
              Command Map
            </h2>
            <div className="rounded-xl overflow-hidden ring-1 ring-gray-700 shadow-xl shadow-black/50">
              <CampusMap height="400px" interactive={true} />
            </div>

            {/* Broadcast form */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg shadow-black/20">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                📢 System Broadcast
              </h3>
              <div className="flex gap-2 mb-3">
                {(['info', 'warning', 'critical'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBroadcastType(t)}
                    className={`flex-1 text-xs py-2 rounded-lg border capitalize font-semibold transition-all active:scale-95 ${
                      broadcastType === t
                        ? t === 'critical'
                          ? 'bg-red-700 border-red-500 text-white shadow-lg shadow-red-900/30'
                          : t === 'warning'
                          ? 'bg-amber-700 border-amber-500 text-white shadow-lg shadow-amber-900/30'
                          : 'bg-blue-700 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                  placeholder="Broadcast to all zones…"
                  className="flex-1 bg-gray-950 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 transition-all"
                />
                <button
                  onClick={handleBroadcast}
                  disabled={!broadcastText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-indigo-900/30"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Incident Table */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-white font-semibold text-sm uppercase tracking-widest opacity-60">
              Active Reports & Dispatch
            </h2>
            <div className="flex items-center gap-2">
              {/* Merge Button */}
              {selectedIncidents.size > 1 && (
                <button
                  onClick={handleMerge}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-900/40 animate-fade-in-up flex items-center gap-1.5"
                >
                  <span>🔗</span> Merge {selectedIncidents.size} Selected
                </button>
              )}
              {/* Type filter */}
              <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5">
                {(['all', 'fire', 'medical', 'security', 'hazmat', 'elevator', 'other'] as const).map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setFilter(t)}
                      title={t}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-md capitalize transition-colors ${
                        filter === t
                          ? 'bg-gray-800 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {t === 'all' ? 'All' : TYPE_ICONS[t]}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="text-xs px-3 py-1.5 font-bold rounded-lg bg-green-900/40 text-green-400 border border-green-800 hover:bg-green-900/60 transition-colors"
              >
                + Add Manual
              </button>
            </div>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <div className="bg-gray-900 border border-green-900/50 rounded-xl p-5 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-down shadow-xl shadow-black/20">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as IncidentType)}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none transition-colors"
                >
                  {(['fire', 'medical', 'security', 'hazmat', 'elevator', 'other'] as const).map(
                    (t) => (
                      <option key={t} value={t}>
                        {TYPE_ICONS[t]} {t.toUpperCase()}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Severity
                </label>
                <select
                  value={newSev}
                  onChange={(e) => setNewSev(e.target.value as Severity)}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none transition-colors"
                >
                  {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Zone</label>
                <select
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value as ZoneId)}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none transition-colors"
                >
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <button
                  onClick={handleCreateIncident}
                  disabled={!newDesc.trim()}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold rounded-lg text-sm transition-all active:scale-95 shadow-lg shadow-green-900/20"
                >
                  Create Incident
                </button>
              </div>
              <div className="col-span-2 lg:col-span-4 mt-2">
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detailed description…"
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 placeholder-gray-600 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Incident cards grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIncidents.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 text-sm bg-gray-900/50 rounded-2xl border border-gray-800/50 border-dashed">
                <span className="text-3xl block mb-2 opacity-30">✨</span>
                No incidents reported
              </div>
            ) : (
              filteredIncidents.map((inc) => (
                <div key={inc.id} className="relative group animate-fade-in-up">
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    {/* Checkbox for merging */}
                    <button
                      onClick={() => toggleSelection(inc.id)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                        selectedIncidents.has(inc.id)
                          ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/50'
                          : 'bg-gray-900/80 border-gray-600 text-transparent hover:border-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      {selectedIncidents.has(inc.id) && <span className="text-xs">✓</span>}
                    </button>
                  </div>
                  
                  <div className={selectedIncidents.has(inc.id) ? 'ring-2 ring-indigo-500 rounded-xl transition-all' : 'transition-all'}>
                    <IncidentCard
                      incident={inc}
                      onAcknowledge={(id) =>
                        updateIncident(id, { status: 'acknowledged', acknowledgedBy: 'Admin' })
                      }
                      onResolve={resolveIncident}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* AI Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_30px_rgba(147,51,234,0.15)] animate-fade-in-up">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="text-white font-bold text-lg">AI Situation Briefing</h3>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="min-h-[100px] flex items-center justify-center">
              {isGeneratingSummary ? (
                <div className="flex flex-col items-center gap-3 text-purple-400">
                  <span className="animate-spin text-2xl">⏳</span>
                  <span className="text-sm font-semibold animate-pulse">Analyzing incident data...</span>
                </div>
              ) : (
                <p className="text-gray-300 text-sm leading-relaxed">
                  {aiSummary}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
