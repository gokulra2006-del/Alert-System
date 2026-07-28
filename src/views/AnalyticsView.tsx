import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store';
import { Incident, TimelineEntry } from '../types';

interface EnrichedIncident {
  incident: Incident;
  timeline: TimelineEntry[];
  timeToAck: number;       // ms, -1 if not acked
  timeToResolve: number;   // ms, -1 if not resolved
  slaBreach: boolean;
}

const SLA_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function formatDuration(ms: number): string {
  if (ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function avgMs(values: number[]): number {
  const valid = values.filter(v => v >= 0);
  if (valid.length === 0) return -1;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

const TYPE_COLORS: Record<string, string> = {
  fire: '#DC2626',
  medical: '#2563EB',
  security: '#D97706',
  hazmat: '#10B981',
  other: '#7C3AED',
  elevator: '#0EA5E9',
};

const ZONE_COLORS: Record<string, string> = {
  north: '#6366f1',
  south: '#22c55e',
  east: '#f59e0b',
  west: '#ec4899',
};

export default function AnalyticsView() {
  const { state } = useStore();
  const [enriched, setEnriched] = useState<EnrichedIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  // Load timelines for all incidents and compute metrics
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const results: EnrichedIncident[] = [];

    for (const incident of state.incidents) {
      try {
        const q = query(
          collection(db, 'incidents', incident.id, 'timeline'),
          orderBy('timestamp', 'asc')
        );
        const snap = await getDocs(q);
        const timeline = snap.docs.map(d => ({ ...d.data(), id: d.id } as TimelineEntry));

        const createdEntry = timeline.find(t => t.action === 'created');
        const ackEntry = timeline.find(t => t.action === 'acknowledged');
        const resolvedEntry = timeline.find(t => t.action === 'resolved');

        const timeToAck = ackEntry && createdEntry
          ? ackEntry.timestamp - createdEntry.timestamp
          : -1;
        const timeToResolve = resolvedEntry && createdEntry
          ? resolvedEntry.timestamp - createdEntry.timestamp
          : -1;

        results.push({
          incident,
          timeline,
          timeToAck,
          timeToResolve,
          slaBreach: timeToAck > SLA_THRESHOLD_MS,
        });
      } catch (e) {
        results.push({
          incident,
          timeline: [],
          timeToAck: -1,
          timeToResolve: -1,
          slaBreach: false,
        });
      }
    }

    setEnriched(results);
    setLoading(false);
  }, [state.incidents]);

  useEffect(() => {
    if (state.incidents.length > 0) {
      loadAnalytics();
    } else {
      setLoading(false);
    }
  }, [state.incidents.length]);

  // ── Compute Metrics ───────────────────────────────────────────────────────
  const totalIncidents = enriched.length;
  const resolvedCount = enriched.filter(e => e.incident.status === 'resolved').length;
  const slaBreachCount = enriched.filter(e => e.slaBreach).length;
  const overallAvgAck = avgMs(enriched.map(e => e.timeToAck));
  const overallAvgResolve = avgMs(enriched.map(e => e.timeToResolve));

  // By Type chart data
  const byType = (['fire', 'medical', 'security', 'hazmat', 'other', 'elevator'] as const).map(type => {
    const items = enriched.filter(e => e.incident.type === type);
    return {
      name: type.charAt(0).toUpperCase() + type.slice(1),
      type,
      count: items.length,
      avgAck: Math.round(avgMs(items.map(i => i.timeToAck)) / 1000 / 60), // minutes
      avgResolve: Math.round(avgMs(items.map(i => i.timeToResolve)) / 1000 / 60),
    };
  }).filter(d => d.count > 0);

  // By Zone chart data
  const byZone = (['north', 'south', 'east', 'west'] as const).map(zone => {
    const items = enriched.filter(e => e.incident.zone === zone);
    return {
      name: zone.charAt(0).toUpperCase() + zone.slice(1),
      zone,
      count: items.length,
      avgAck: Math.round(avgMs(items.map(i => i.timeToAck)) / 1000 / 60),
      avgResolve: Math.round(avgMs(items.map(i => i.timeToResolve)) / 1000 / 60),
    };
  }).filter(d => d.count > 0);

  // Trend data (daily counts over last N days)
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const trendData = Array.from({ length: trendDays }, (_, i) => {
    const dayStart = now - (trendDays - 1 - i) * dayMs;
    const dayEnd = dayStart + dayMs;
    const label = new Date(dayStart).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const count = enriched.filter(e =>
      e.incident.reportedAt >= dayStart && e.incident.reportedAt < dayEnd
    ).length;
    const resolved = enriched.filter(e =>
      e.incident.reportedAt >= dayStart && e.incident.reportedAt < dayEnd && e.incident.status === 'resolved'
    ).length;
    return { label, count, resolved };
  });

  // SLA Breach list
  const slaBreachers = enriched
    .filter(e => e.slaBreach)
    .sort((a, b) => b.timeToAck - a.timeToAck);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
        <p className="text-white font-bold mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-400">{p.name}:</span>
            <span className="text-white font-semibold">{p.value}{p.name.includes('Time') ? 'm' : ''}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading analytics data from Firestore...</p>
      </div>
    );
  }

  if (totalIncidents === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="text-4xl">📊</span>
        <p className="text-white font-semibold">No Data Yet</p>
        <p className="text-gray-500 text-sm">Analytics will populate as incidents are created and resolved.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Incidents', value: totalIncidents, color: '#6366f1', icon: '📋' },
          { label: 'Resolved', value: `${resolvedCount}/${totalIncidents}`, color: '#22c55e', icon: '✅' },
          { label: 'Avg Time to Acknowledge', value: formatDuration(overallAvgAck), color: '#0ea5e9', icon: '👁' },
          { label: 'Avg Time to Resolve', value: formatDuration(overallAvgResolve), color: '#a855f7', icon: '⏱' },
        ].map(s => (
          <div
            key={s.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-1"
            style={{ borderTop: `3px solid ${s.color}` }}
          >
            <div className="text-xl">{s.icon}</div>
            <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* SLA Breach Banner */}
      {slaBreachCount > 0 && (
        <div className="bg-red-950/50 border border-red-900/60 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-red-400 font-bold text-sm">
              {slaBreachCount} SLA Breach{slaBreachCount !== 1 ? 'es' : ''} Detected
            </p>
            <p className="text-red-300/70 text-xs mt-0.5">
              Incidents where acknowledgement took longer than 5 minutes. See the table below.
            </p>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-sm">📈 Incident Trend</h3>
          <div className="flex gap-1">
            {([7, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setTrendDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  trendDays === d
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Line type="monotone" dataKey="count" name="Reported" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* By Type + By Zone side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* By Type */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">🔥 Response Time by Incident Type</h3>
          {byType.length === 0 ? (
            <p className="text-gray-600 text-sm">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} unit="m" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#9ca3af' }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgAck" name="Avg Ack Time" radius={[0, 4, 4, 0]}>
                  {byType.map(entry => (
                    <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Zone */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">🗺️ Response Time by Zone</h3>
          {byZone.length === 0 ? (
            <p className="text-gray-600 text-sm">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byZone}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} unit="m" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgAck" name="Avg Ack Time" radius={[4, 4, 0, 0]}>
                  {byZone.map(entry => (
                    <Cell key={entry.zone} fill={ZONE_COLORS[entry.zone] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SLA Breach Table */}
      {slaBreachers.length > 0 && (
        <div className="bg-gray-900/60 border border-red-900/30 rounded-2xl p-5">
          <h3 className="text-red-400 font-bold text-sm mb-4">⚠️ SLA Breach Report — Incidents Taking &gt;5 min to Acknowledge</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left pb-2 font-semibold">Type</th>
                  <th className="text-left pb-2 font-semibold">Zone</th>
                  <th className="text-left pb-2 font-semibold">Severity</th>
                  <th className="text-left pb-2 font-semibold">Reported At</th>
                  <th className="text-left pb-2 font-semibold text-red-400">Time to Ack</th>
                </tr>
              </thead>
              <tbody>
                {slaBreachers.map(({ incident, timeToAck }) => (
                  <tr key={incident.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 capitalize text-white font-semibold">{incident.type}</td>
                    <td className="py-2 capitalize text-gray-400">{incident.zone}</td>
                    <td className="py-2">
                      <span className="capitalize font-semibold" style={{ color: { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#dc2626', pending: '#6b7280' }[incident.severity] }}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">
                      {new Date(incident.reportedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </td>
                    <td className="py-2 font-bold text-red-400">{formatDuration(timeToAck)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
