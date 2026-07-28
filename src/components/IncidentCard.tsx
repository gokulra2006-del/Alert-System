import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Incident,
  IncidentType,
  INCIDENT_COLORS,
  SEVERITY_COLORS,
  TRIAGE_COLORS,
  TriageTag,
} from '../types';
import { useStore } from '../store';

// ── Static config ─────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  fire: '🔥',
  medical: '🏥',
  security: '🛡️',
  hazmat: '☢️',
  other: '⚠️',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  archived: 'Archived',
};

const RESOURCE_OPTIONS: Record<IncidentType, { icon: string; label: string }[]> = {
  fire: [
    { icon: '🧯', label: 'Extinguisher' },
    { icon: '🚒', label: 'Fire Truck' },
  ],
  medical: [
    { icon: '🩹', label: 'First Aid Kit' },
    { icon: '🫁', label: 'O2 / CPR' },
    { icon: '🚑', label: 'Ambulance' },
  ],
  security: [
    { icon: '👮', label: 'Security Guard' },
    { icon: '🚔', label: 'Police' },
  ],
  elevator: [
    { icon: '🔧', label: 'Technician' },
    { icon: '🚒', label: 'Fire Dept' },
  ],
  hazmat: [
    { icon: '🧪', label: 'Hazmat Team' },
    { icon: '🚒', label: 'Fire Truck' },
  ],
  other: [
    { icon: '🔧', label: 'Maintenance' },
    { icon: '📡', label: 'Support' },
  ],
};

const TRIAGE_OPTIONS: { tag: NonNullable<TriageTag>; icon: string; label: string; color: string }[] = [
  { tag: 'immediate', icon: '🔴', label: 'Immediate', color: '#DC2626' },
  { tag: 'delayed',   icon: '🟡', label: 'Delayed',   color: '#F59E0B' },
  { tag: 'minor',     icon: '🟢', label: 'Minor',     color: '#22C55E' },
  { tag: 'deceased',  icon: '⚫', label: 'Deceased',  color: '#374151' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// ── Response timer sub-component ──────────────────────────────────────────────

function ResponseTimer({ startTime, frozen }: { startTime: number; frozen: boolean }) {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (frozen) return;
    rafRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => { if (rafRef.current) clearInterval(rafRef.current); };
  }, [startTime, frozen]);

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
      <span>{frozen ? '⏹' : '▶'}</span>
      <span>Responding: {formatClock(elapsed)}</span>
    </div>
  );
}

// ── Media thumbnail / video modal ─────────────────────────────────────────────

function MediaSection({ incident }: { incident: Incident }) {
  const [modalOpen, setModalOpen] = useState<'video' | null>(null);
  
  if (!incident.thumbnailUrl && !incident.mediaUrl && !incident.audioUrl) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {(incident.thumbnailUrl || incident.mediaUrl) && (
        <>
          <div
            className="relative cursor-pointer rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors"
            style={{ width: 80, height: 60 }}
            onClick={() => setModalOpen('video')}
          >
            {incident.thumbnailUrl ? (
              <img
                src={incident.thumbnailUrl}
                alt="Incident thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xl">
                🎥
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-all">
              <span className="text-white text-lg drop-shadow-md">▶</span>
            </div>
          </div>

          {/* Video modal */}
          {modalOpen === 'video' && incident.mediaUrl && createPortal(
            <div
              className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center backdrop-blur-sm"
              onClick={() => setModalOpen(null)}
            >
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <video
                  src={incident.mediaUrl}
                  controls
                  autoPlay
                  className="max-w-[90vw] max-h-[80vh] rounded-xl ring-1 ring-gray-700 shadow-2xl"
                />
                <button
                  onClick={() => setModalOpen(null)}
                  className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-gray-800 border border-gray-600 text-white text-sm flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>,
            document.body
          )}
        </>
      )}

      {/* Audio player */}
      {incident.audioUrl && (
        <div className="flex flex-col justify-center bg-gray-900/60 border border-gray-700 rounded-lg p-2" style={{ height: 60 }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs">🎙️</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Audio Report</span>
          </div>
          <audio src={incident.audioUrl} controls className="h-6 w-48 opacity-90 scale-90 origin-left" />
        </div>
      )}
    </div>
  );
}

// ── Main IncidentCard ─────────────────────────────────────────────────────────

interface Props {
  incident: Incident;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  onEscalate?: (id: string) => void;
  showResourceButtons?: boolean;
  showTriageTags?: boolean;
  compact?: boolean;
}

export default function IncidentCard({
  incident,
  onAcknowledge,
  onResolve,
  onEscalate,
  showResourceButtons = false,
  showTriageTags = false,
  compact = false,
}: Props) {
  const [aiPlan, setAiPlan] = React.useState<{ title: string; detail: string }[] | null>(null);
  const [loadingPlan, setLoadingPlan] = React.useState(false);
  const { updateIncident } = useStore();
  const color = INCIDENT_COLORS[incident.type];
  const sevColor = SEVERITY_COLORS[incident.severity];

  function handleResource(resource: string) {
    updateIncident(incident.id, { responderResource: resource });
  }

  function handleTriage(tag: NonNullable<TriageTag>) {
    const next = incident.triageTag === tag ? null : tag;
    updateIncident(incident.id, { triageTag: next });
  }

  function handleWindDirection(dir: 'N' | 'S' | 'E' | 'W' | undefined) {
    updateIncident(incident.id, { windDirection: dir });
  }

  function handleRadius(rad: number | undefined) {
    updateIncident(incident.id, { contaminationRadius: rad });
  }

  return (
    <div
      className="relative overflow-hidden shrink-0 bg-gray-800/40 backdrop-blur-md border border-gray-700 rounded-xl p-4 flex flex-col gap-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-gray-500 transition-all duration-300 group"
      style={{
        borderLeft: `4px solid ${color}`,
        background: `linear-gradient(135deg, rgba(31,41,55,0.4) 0%, rgba(17,24,39,0.8) 100%)`
      }}
    >
      {/* Subtle ambient glow behind the card based on type */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
        style={{ background: color, transform: 'translate(30%, -30%)' }}
      />
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{TYPE_ICONS[incident.type]}</span>
          <div>
            <div className="font-semibold text-white text-sm capitalize">
              {incident.type} Incident
            </div>
            <div className="text-xs text-gray-400">
              {incident.zone?.toUpperCase()} Zone · {timeAgo(incident.reportedAt)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${sevColor}22`, color: sevColor, border: `1px solid ${sevColor}55` }}
          >
            {incident.severity.toUpperCase()}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            incident.status === 'active'
              ? 'bg-red-900/40 text-red-300'
              : incident.status === 'acknowledged'
              ? 'bg-amber-900/40 text-amber-300'
              : 'bg-green-900/40 text-green-300'
          }`}>
            {STATUS_LABEL[incident.status]}
          </span>
        </div>
      </div>

      {!compact && incident.type !== 'elevator' && (
        <p className="text-sm text-gray-300 leading-snug">{incident.description}</p>
      )}

      {!compact && incident.type === 'elevator' && (
        <div className="bg-gray-900/50 rounded-lg p-2.5 flex flex-col gap-1.5 border border-gray-700">
          <div className="flex gap-4">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Bldg:</span>
              <span className="text-xs text-white ml-1 font-semibold">{incident.buildingName}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Lift:</span>
              <span className="text-xs text-white ml-1 font-semibold">{incident.elevatorNumber}</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Floors:</span>
            <span className="text-xs text-gray-300 ml-1">{incident.floorRange}</span>
          </div>
          <p className="text-sm text-gray-400 leading-snug mt-1 border-t border-gray-800 pt-1">{incident.description}</p>
        </div>
      )}

      {/* Media thumbnail */}
      {!compact && <MediaSection incident={incident} />}

      {/* Triage tag display */}
      {incident.triageTag && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Triage:</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: `${TRIAGE_COLORS[incident.triageTag]}22`,
              color: TRIAGE_COLORS[incident.triageTag],
              border: `1px solid ${TRIAGE_COLORS[incident.triageTag]}55`,
            }}
          >
            {TRIAGE_OPTIONS.find(t => t.tag === incident.triageTag)?.icon} {incident.triageTag.toUpperCase()}
          </span>
        </div>
      )}

      {/* Resource dispatched badge */}
      {incident.responderResource && (
        <div className="text-xs text-blue-400 flex items-center gap-1">
          <span>📡</span>
          <span>Dispatched: <strong>{incident.responderResource}</strong></span>
        </div>
      )}

      {/* Acknowledge / Escalate / Resolve row */}
      {!compact && (onAcknowledge || onResolve || onEscalate) && (
        <div className="flex gap-2 flex-wrap">
          {onAcknowledge && incident.status === 'active' && (
            <button
              onClick={() => onAcknowledge(incident.id)}
              className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
            >
              Acknowledge
            </button>
          )}
          {onEscalate && incident.status !== 'resolved' && (
            <button
              onClick={() => onEscalate(incident.id)}
              className="text-xs px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              Escalate
            </button>
          )}
          {onResolve && incident.status !== 'resolved' && (
            <button
              onClick={() => onResolve(incident.id)}
              className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              Resolve
            </button>
          )}
        </div>
      )}

      {/* Response timer (Feature 3) */}
      {!compact && incident.responseStartTime && (
        <ResponseTimer
          startTime={incident.responseStartTime}
          frozen={incident.status === 'resolved'}
        />
      )}

      {/* Triage tag buttons (Feature 6) */}
      {!compact && showTriageTags && incident.status !== 'resolved' && (
        <div className="border-t border-gray-700/60 pt-2">
          <p className="text-xs text-gray-500 mb-1.5">Triage Tag</p>
          <div className="flex gap-1.5 flex-wrap">
            {TRIAGE_OPTIONS.map(({ tag, icon, label, color: tc }) => (
              <button
                key={tag}
                onClick={() => handleTriage(tag)}
                className="text-xs px-2 py-1 rounded-lg border font-medium transition-all"
                style={{
                  background: incident.triageTag === tag ? `${tc}33` : 'transparent',
                  borderColor: incident.triageTag === tag ? tc : '#374151',
                  color: incident.triageTag === tag ? tc : '#9CA3AF',
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resource dispatch buttons (Feature 3) */}
      {!compact && showResourceButtons && incident.status !== 'resolved' && (
        <div className="border-t border-gray-700/60 pt-2">
          <p className="text-xs text-gray-500 mb-1.5">Dispatch Resource</p>
          <div className="flex gap-1.5 flex-wrap">
            {RESOURCE_OPTIONS[incident.type].map(({ icon, label }) => (
              <button
                key={label}
                onClick={() => handleResource(`${icon} ${label}`)}
                className="text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all"
                style={{
                  background: incident.responderResource === `${icon} ${label}`
                    ? 'rgba(37,99,235,0.2)'
                    : 'rgba(31,41,55,0.6)',
                  borderColor: incident.responderResource === `${icon} ${label}`
                    ? '#2563EB'
                    : '#374151',
                  color: incident.responderResource === `${icon} ${label}`
                    ? '#60A5FA'
                    : '#9CA3AF',
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wind/Contamination Settings (Feature 7) */}
      {!compact && (incident.type === 'fire' || incident.type === 'hazmat') && incident.status !== 'resolved' && (
        <div className="border-t border-gray-700/60 pt-3 mt-1">
          <p className="text-xs text-gray-500 mb-2">Environmental & Danger Zone</p>
          <div className="flex gap-2">
            <select
              value={incident.windDirection || ''}
              onChange={(e) => handleWindDirection(e.target.value ? e.target.value as any : undefined)}
              className="bg-gray-950 border border-gray-700 text-xs text-white rounded-lg px-2 py-2 flex-1 outline-none focus:border-indigo-500"
            >
              <option value="">No Wind Data</option>
              <option value="N">Wind: North ⬆️</option>
              <option value="S">Wind: South ⬇️</option>
              <option value="E">Wind: East ➡️</option>
              <option value="W">Wind: West ⬅️</option>
            </select>
            <select
              value={incident.contaminationRadius || ''}
              onChange={(e) => handleRadius(e.target.value ? parseInt(e.target.value) : undefined)}
              className="bg-gray-950 border border-gray-700 text-xs text-white rounded-lg px-2 py-2 flex-1 outline-none focus:border-indigo-500"
            >
              <option value="">No Danger Radius</option>
              <option value="20">20m (Local)</option>
              <option value="50">50m (Block)</option>
              <option value="100">100m (Zone)</option>
            </select>
          </div>
        </div>
      )}

      {/* Ack info */}
      {/* Ack info */}
      {!compact && incident.acknowledgedBy && (
        <div className="text-xs text-gray-500 mt-2">
          Ack by: <span className="text-gray-400">{incident.acknowledgedBy}</span>
        </div>
      )}

      {/* AI Action Plan Button & Modal */}
      {!compact && (
        <div className="border-t border-gray-700/60 pt-3 mt-1">
          <button
            onClick={async () => {
              if (aiPlan) {
                setAiPlan(null);
                return;
              }
              setLoadingPlan(true);
              try {
                const res = await fetch('http://localhost:3001/api/ai/action-plan', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ incident }),
                });
                const data = await res.json();
                if (data.steps) setAiPlan(data.steps);
              } catch (e) {
                console.error(e);
              }
              setLoadingPlan(false);
            }}
            className="w-full flex justify-center items-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all relative overflow-hidden group/btn"
            style={{
              background: aiPlan ? 'rgba(79,70,229,0.2)' : 'linear-gradient(135deg, #4f46e5, #4338ca)',
              border: '1px solid rgba(79,70,229,0.5)',
              color: '#c7d2fe'
            }}
          >
            {loadingPlan ? (
              <span className="animate-pulse">Analyzing Incident...</span>
            ) : aiPlan ? (
              <><span>Hide AI Action Plan</span></>
            ) : (
              <><span>🤖</span> <span>Generate AI Action Plan</span></>
            )}
            
            {/* Shimmer effect */}
            {!aiPlan && !loadingPlan && (
              <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
            )}
          </button>

          {/* AI Plan Display Area */}
          {aiPlan && (
            <div className="mt-3 bg-gray-900/60 border border-indigo-900/50 rounded-xl p-4 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-indigo-400 text-lg">🤖</span>
                <span className="text-sm font-bold text-indigo-300">AI Tactical Action Plan</span>
              </div>
              <div className="flex flex-col gap-3 relative">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-indigo-900/50" />
                {aiPlan.map((step, idx) => (
                  <div key={idx} className="relative z-10 flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0 shadow-[0_0_10px_rgba(79,70,229,0.4)]">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-indigo-200 text-sm font-bold leading-tight mb-1">{step.title}</h4>
                      <p className="text-indigo-200/70 text-xs leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
