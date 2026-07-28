import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store';
import { Incident, TimelineEntry } from '../types';
import { generateIncidentPDF } from '../utils/pdfExport';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatDuration(ms: number): string {
  if (ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const ACTION_COLORS: Record<TimelineEntry['action'], string> = {
  created: '#6366f1',
  acknowledged: '#0ea5e9',
  escalated: '#f97316',
  resource_assigned: '#a855f7',
  resolved: '#22c55e',
  merged: '#64748b',
  updated: '#94a3b8',
};

const ACTION_ICONS: Record<TimelineEntry['action'], string> = {
  created: '🆕',
  acknowledged: '👁',
  escalated: '⚡',
  resource_assigned: '🚒',
  resolved: '✅',
  merged: '🔀',
  updated: '✏️',
};

export default function AuditView() {
  const { state } = useStore();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchText, setSearchText] = useState('');

  // Filter incidents by date range + search
  const filteredIncidents = state.incidents.filter(inc => {
    const matchesSearch = !searchText ||
      inc.description.toLowerCase().includes(searchText.toLowerCase()) ||
      inc.type.toLowerCase().includes(searchText.toLowerCase()) ||
      (inc.zone || '').toLowerCase().includes(searchText.toLowerCase());
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : 0;
    const toMs = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity;
    return matchesSearch && inc.reportedAt >= fromMs && inc.reportedAt <= toMs;
  });

  const loadTimeline = useCallback(async (incident: Incident) => {
    setSelectedIncident(incident);
    setTimeline([]);
    setLoadingTimeline(true);
    try {
      const q = query(
        collection(db, 'incidents', incident.id, 'timeline'),
        orderBy('timestamp', 'asc')
      );
      const snap = await getDocs(q);
      const entries = snap.docs.map(d => ({ ...d.data(), id: d.id } as TimelineEntry));
      setTimeline(entries);
    } catch (e) {
      console.error('Failed to load timeline:', e);
      setTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  async function handleExportPDF() {
    if (!selectedIncident) return;
    setExportingPdf(true);
    try {
      generateIncidentPDF(selectedIncident, timeline);
    } finally {
      setExportingPdf(false);
    }
  }

  // Compute metrics for selected incident
  const createdEntry = timeline.find(t => t.action === 'created');
  const ackEntry = timeline.find(t => t.action === 'acknowledged');
  const resolvedEntry = timeline.find(t => t.action === 'resolved');
  const timeToAck = ackEntry && createdEntry ? ackEntry.timestamp - createdEntry.timestamp : -1;
  const timeToResolve = resolvedEntry && createdEntry ? resolvedEntry.timestamp - createdEntry.timestamp : -1;
  const slaBreach = timeToAck > 5 * 60 * 1000;

  const severityColors: Record<string, string> = {
    low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#dc2626', pending: '#6b7280',
  };

  return (
    <div className="flex gap-4 h-full min-h-[600px]">
      {/* Left — Incident List */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="🔍 Search incidents..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[600px] pr-1">
          {filteredIncidents.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8">No incidents found</div>
          )}
          {filteredIncidents.map(inc => (
            <button
              key={inc.id}
              onClick={() => loadTimeline(inc)}
              className={`text-left w-full rounded-xl p-3 border transition-all ${
                selectedIncident?.id === inc.id
                  ? 'bg-indigo-950/60 border-indigo-600'
                  : 'bg-gray-900/60 border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white uppercase">{inc.type}</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{
                    background: `${severityColors[inc.severity]}20`,
                    color: severityColors[inc.severity],
                    border: `1px solid ${severityColors[inc.severity]}40`,
                  }}
                >
                  {inc.severity}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 truncate">{inc.description}</div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-gray-500 capitalize">{inc.zone} zone</span>
                <span className="text-[10px] text-gray-600">{formatTime(inc.reportedAt)}</span>
              </div>
              <div className="mt-1">
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${
                    inc.status === 'resolved'
                      ? 'bg-emerald-950/60 text-emerald-400'
                      : inc.status === 'acknowledged'
                      ? 'bg-blue-950/60 text-blue-400'
                      : 'bg-red-950/60 text-red-400'
                  }`}
                >
                  {inc.status}
                </span>
                {inc.isEscalated && (
                  <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-400">
                    ESCALATED
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right — Timeline Panel */}
      <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
        {!selectedIncident ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl">📋</span>
            <div>
              <p className="text-white font-semibold">Select an Incident</p>
              <p className="text-gray-500 text-sm mt-1">Click any incident on the left to view its full audit trail and export a PDF report</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-bold text-lg capitalize">
                    {selectedIncident.type} Incident
                  </h3>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded uppercase"
                    style={{
                      background: `${severityColors[selectedIncident.severity]}20`,
                      color: severityColors[selectedIncident.severity],
                      border: `1px solid ${severityColors[selectedIncident.severity]}40`,
                    }}
                  >
                    {selectedIncident.severity}
                  </span>
                  {selectedIncident.isEscalated && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-900/50">
                      ⚡ ESCALATED
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-1">{selectedIncident.description}</p>
                <p className="text-gray-600 text-xs mt-0.5">
                  {selectedIncident.zone?.toUpperCase()} Zone · {formatTime(selectedIncident.reportedAt)}
                </p>
              </div>
              <button
                onClick={handleExportPDF}
                disabled={exportingPdf || loadingTimeline}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {exportingPdf ? '⏳ Generating...' : '📄 Export PDF'}
              </button>
            </div>

            {/* Metrics Row */}
            {!loadingTimeline && timeline.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Time to Acknowledge', value: formatDuration(timeToAck), warn: slaBreach },
                  { label: 'Time to Resolve', value: formatDuration(timeToResolve) },
                  { label: 'SLA Status', value: slaBreach ? '⚠ BREACH' : '✅ Within SLA', warn: slaBreach },
                ].map(m => (
                  <div
                    key={m.label}
                    className={`rounded-xl border p-3 ${
                      m.warn
                        ? 'bg-red-950/40 border-red-900/50'
                        : 'bg-gray-800/60 border-gray-700/50'
                    }`}
                  >
                    <div className={`text-sm font-bold ${m.warn ? 'text-red-400' : 'text-white'}`}>
                      {m.value}
                    </div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-0.5">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                📋 Immutable Audit Timeline
              </h4>

              {loadingTimeline ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  Loading timeline...
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-gray-600 text-sm py-4">
                  No timeline entries yet. Actions on this incident will appear here automatically.
                </div>
              ) : (
                <div className="relative flex flex-col gap-0">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-800" />

                  {[...timeline].sort((a, b) => a.timestamp - b.timestamp).map((entry, idx) => (
                    <div key={entry.id || idx} className="relative flex gap-4 items-start py-3">
                      {/* Dot */}
                      <div
                        className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2"
                        style={{
                          background: `${ACTION_COLORS[entry.action]}20`,
                          borderColor: ACTION_COLORS[entry.action],
                        }}
                      >
                        {ACTION_ICONS[entry.action]}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-bold"
                            style={{ color: ACTION_COLORS[entry.action] }}
                          >
                            {entry.action.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-gray-500 text-xs">by {entry.actorName}</span>
                          {entry.previousStatus && entry.newStatus && (
                            <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                              {entry.previousStatus} → {entry.newStatus}
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-gray-400 text-xs mt-0.5">{entry.notes}</p>
                        )}
                        <p className="text-gray-600 text-[10px] mt-0.5">{formatTime(entry.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
