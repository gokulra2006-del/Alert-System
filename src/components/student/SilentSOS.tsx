import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import { useGPS } from '../../hooks/useGPS';
import { Incident, generateId, getZoneForLocation } from '../../types';

type SOSState = 'idle' | 'holding' | 'submitting' | 'sent';

const HOLD_DURATION = 2000; // 2 s
const R = 26;                // SVG circle radius
const C = 2 * Math.PI * R;   // circumference

export default function SilentSOS() {
  const { addIncident } = useStore();
  const { getLocation } = useGPS();

  const [sosState, setSOSState] = useState<SOSState>('idle');
  const [progress, setProgress] = useState(0); // 0–1

  const holdStart = useRef<number | null>(null);
  const rafId    = useRef<number | null>(null);
  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Animation tick ──────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (holdStart.current === null) return;
    const elapsed = Date.now() - holdStart.current;
    const pct = Math.min(elapsed / HOLD_DURATION, 1);
    setProgress(pct);
    if (pct < 1) {
      rafId.current = requestAnimationFrame(tick);
    } else {
      doSubmit();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start hold ──────────────────────────────────────────────────────────────
  const startHold = useCallback(
    (e: React.PointerEvent) => {
      if (sosState !== 'idle') return;
      e.preventDefault();
      holdStart.current = Date.now();
      setSOSState('holding');
      setProgress(0);
      rafId.current = requestAnimationFrame(tick);
    },
    [sosState, tick]
  );

  // ── Cancel hold ─────────────────────────────────────────────────────────────
  const cancelHold = useCallback(() => {
    if (sosState !== 'holding') return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    holdStart.current = null;
    setSOSState('idle');
    setProgress(0);
  }, [sosState]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function doSubmit() {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    holdStart.current = null;
    setSOSState('submitting');

    const loc = await getLocation();
    const zone = getZoneForLocation(loc);

    const incident: Incident = {
      id: generateId(),
      type: 'security',
      severity: 'critical',
      status: 'active',
      zone,
      location: loc,
      description:
        '🔕 SILENT SOS — Student in distress. Discreet response required. Do NOT call back.',
      reportedBy: 'Student (Silent SOS)',
      reportedAt: Date.now(),
      updatedAt: Date.now(),
      isSOS: true,
    };

    addIncident(incident);
    setSOSState('sent');
    setProgress(1);

    sentTimer.current = setTimeout(() => {
      setSOSState('idle');
      setProgress(0);
    }, 5000);
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (sentTimer.current) clearTimeout(sentTimer.current);
    };
  }, []);

  const dashOffset = C * (1 - progress);

  return (
    <>
      <style>{`
        @keyframes sos-idle-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(124,58,237,0.65), 0 6px 24px rgba(0,0,0,0.6); }
          70%  { box-shadow: 0 0 0 14px rgba(124,58,237,0),   0 6px 24px rgba(0,0,0,0.6); }
          100% { box-shadow: 0 0 0 0   rgba(124,58,237,0),    0 6px 24px rgba(0,0,0,0.6); }
        }
        @keyframes sos-sent-pulse {
          0%,100% { box-shadow: 0 0 0 0   rgba(167,139,250,0.55), 0 6px 24px rgba(0,0,0,0.6); }
          50%     { box-shadow: 0 0 0 10px rgba(167,139,250,0),   0 6px 24px rgba(0,0,0,0.6); }
        }
      `}</style>

      <button
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        disabled={sosState === 'submitting'}
        className="fixed bottom-6 right-6 z-50 select-none touch-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        title="Hold 2 seconds to send Silent SOS"
        aria-label="Silent SOS — hold for 2 seconds"
      >
        {/* Progress ring SVG */}
        <svg
          width="72" height="72" viewBox="0 0 72 72"
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)', pointerEvents: 'none' }}
        >
          {/* Track */}
          <circle
            cx="36" cy="36" r={R}
            fill="none"
            stroke="rgba(124,58,237,0.2)"
            strokeWidth="3"
          />
          {/* Arc */}
          {sosState !== 'idle' && (
            <circle
              cx="36" cy="36" r={R}
              fill="none"
              stroke={sosState === 'sent' ? '#A78BFA' : '#C084FC'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dashOffset}
              style={{
                transition:
                  sosState === 'submitting'
                    ? 'none'
                    : 'stroke-dashoffset 0.04s linear',
              }}
            />
          )}
        </svg>

        {/* Disc */}
        <div
          className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center transition-transform duration-150"
          style={{
            background:
              sosState === 'sent'
                ? 'radial-gradient(circle at 40% 35%, #6D28D9, #4C1D95)'
                : 'radial-gradient(circle at 40% 35%, #7C3AED, #5B21B6)',
            transform:
              sosState === 'holding' ? 'scale(0.93)' : 'scale(1)',
            animation:
              sosState === 'idle'
                ? 'sos-idle-pulse 2.5s ease-in-out infinite'
                : sosState === 'sent'
                ? 'sos-sent-pulse 1.8s ease-in-out infinite'
                : 'none',
          }}
        >
          {sosState === 'sent' ? (
            /* Faint checkmark — discreet */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : sosState === 'holding' ? (
            <div className="flex flex-col items-center leading-none gap-0.5">
              <span className="text-purple-200 font-bold" style={{ fontSize: 9 }}>
                HOLD
              </span>
              <span className="text-white font-black" style={{ fontSize: 15 }}>
                {Math.ceil((1 - progress) * (HOLD_DURATION / 1000))}
              </span>
            </div>
          ) : (
            <span
              className="font-black text-white tracking-widest"
              style={{ fontSize: 13 }}
            >
              SOS
            </span>
          )}
        </div>
      </button>
    </>
  );
}
