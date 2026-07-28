import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { useGPS } from '../hooks/useGPS';
import { Incident, generateId, getZoneForLocation } from '../types';

type SOSState = 'idle' | 'holding' | 'submitting' | 'sent';

const HOLD_DURATION = 2000; // 2 seconds
const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function SilentSOS() {
  const { addIncident } = useStore();
  const { getLocation } = useGPS();

  const [sosState, setSOSState] = useState<SOSState>('idle');
  const [progress, setProgress] = useState(0); // 0–1
  const holdStart = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate the progress ring during hold
  const tick = useCallback(() => {
    if (holdStart.current === null) return;
    const elapsed = Date.now() - holdStart.current;
    const pct = Math.min(elapsed / HOLD_DURATION, 1);
    setProgress(pct);

    if (pct < 1) {
      rafId.current = requestAnimationFrame(tick);
    } else {
      // Hold complete — submit
      submit();
    }
  }, []);

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

  const cancelHold = useCallback(() => {
    if (sosState !== 'holding') return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    holdStart.current = null;
    setSOSState('idle');
    setProgress(0);
  }, [sosState]);

  async function submit() {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    holdStart.current = null;
    setSOSState('submitting');
    setProgress(1);

    const loc = await getLocation();
    const zone = getZoneForLocation(loc);

    const incident: Incident = {
      id: generateId(),
      type: 'security',
      severity: 'critical',
      status: 'active',
      zone,
      location: loc,
      description: '🔕 SILENT SOS — Student in distress. Discreet response required. Do NOT call back.',
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (sentTimer.current) clearTimeout(sentTimer.current);
    };
  }, []);

  // Stroke dash for progress ring
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const bgColor =
    sosState === 'sent'
      ? '#7C3AED'
      : sosState === 'holding' || sosState === 'submitting'
      ? '#4B1D8F'
      : '#7C3AED';

  return (
    <button
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => e.preventDefault()} // prevent browser context menu on long press
      disabled={sosState === 'submitting'}
      className="fixed bottom-6 right-6 z-50 select-none touch-none"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      title="Hold 2 seconds to send Silent SOS"
      aria-label="Silent SOS — hold 2 seconds to send distress signal"
    >
      {/* Outer SVG ring */}
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          stroke="rgba(124,58,237,0.25)"
          strokeWidth="3"
        />
        {/* Progress arc */}
        {(sosState === 'holding' || sosState === 'submitting' || sosState === 'sent') && (
          <circle
            cx="36"
            cy="36"
            r={RADIUS}
            fill="none"
            stroke={sosState === 'sent' ? '#A78BFA' : '#C084FC'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: sosState === 'submitting' ? 'none' : 'stroke-dashoffset 0.05s linear' }}
          />
        )}
      </svg>

      {/* Button disc */}
      <div
        className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-200"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${bgColor}dd, ${bgColor})`,
          boxShadow:
            sosState === 'idle'
              ? '0 0 0 0 rgba(124,58,237,0.6), 0 6px 24px rgba(0,0,0,0.6)'
              : sosState === 'sent'
              ? '0 0 20px rgba(167,139,250,0.5), 0 6px 24px rgba(0,0,0,0.6)'
              : '0 6px 24px rgba(0,0,0,0.6)',
          animation: sosState === 'idle' ? 'sos-pulse 2.5s infinite' : 'none',
          transform: sosState === 'holding' ? 'scale(0.94)' : 'scale(1)',
        }}
      >
        {sosState === 'sent' ? (
          /* Faint checkmark */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : sosState === 'holding' ? (
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="font-black text-white text-xs leading-none"
              style={{ fontSize: 10 }}
            >
              HOLD
            </span>
            <span
              className="font-black text-purple-200 text-xs"
              style={{ fontSize: 10 }}
            >
              {Math.ceil((1 - progress) * 2)}s
            </span>
          </div>
        ) : (
          <span
            className="font-black text-white leading-none tracking-wider"
            style={{ fontSize: 13 }}
          >
            SOS
          </span>
        )}
      </div>
    </button>
  );
}
