import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { useGPS, VIT_CENTER } from '../../hooks/useGPS';
import {
  Incident,
  IncidentType,
  generateId,
  getZoneForLocation,
  Severity,
} from '../../types';
import ConfirmationPulse from './ConfirmationPulse';
import MediaCapture from './MediaCapture';
import ActionGuideCard from './ActionGuideCard';
import EvacuationCard from './EvacuationCard';
import CprGuideCard from './CprGuideCard';
import AudioCapture from './AudioCapture';

export interface EmergencyButtonConfig {
  type: IncidentType;
  icon: string;
  label: string;
  bg: string;
  glow: string;
  severity: Severity;
  description: string;
  fullWidth?: boolean;
}

interface Props {
  config: EmergencyButtonConfig;
  onDispatch?: (incidentId: string) => void;
}

export default function EmergencyButton({ config, onDispatch }: Props) {
  const { addIncident } = useStore();
  const { getLocation } = useGPS();

  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger dispatch when swiped to 100%
  useEffect(() => {
    if (progress >= 100 && !isSuccess && !isLoading) {
      handleDispatch();
    }
  }, [progress, isSuccess, isLoading]);

  async function handleDispatch() {
    setIsLoading(true);
    let loc = VIT_CENTER;
    try {
      loc = await getLocation();
    } catch {
      console.warn('Could not get GPS, using default center');
    }

    const zone = getZoneForLocation(loc);

    const incident: Incident = {
      id: generateId(),
      type: config.type,
      severity: config.severity,
      status: 'active',
      zone,
      location: loc,
      description: config.description,
      reportedBy: 'Student', // Ideally from auth
      reportedAt: Date.now(),
      updatedAt: Date.now(),
    };

    addIncident(incident);

    // Simulate network delay for realism
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setPulseKey(prev => prev + 1);

      if (onDispatch) {
        onDispatch(incident.id);
      }
    }, 400);
  }

  // --- Swiper Drag Logic ---
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isSuccess || isLoading) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isSuccess || isLoading || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let percent = (x / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));
    setProgress(percent);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (progress < 100 && !isSuccess) {
      setProgress(0); // snap back
    }
  };

  const btnState = isSuccess ? 'success' : isLoading ? 'loading' : 'idle';

  return (
    <div
      className={`relative select-none touch-none ${
        config.fullWidth ? 'col-span-2' : 'col-span-1'
      }`}
    >
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl h-24 flex items-center justify-center text-white transition-all will-change-transform backdrop-blur-xl"
        style={{
          background: isSuccess
            ? 'linear-gradient(135deg, rgba(6,78,59,0.9), rgba(6,78,59,0.6))'
            : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
          border: `1px solid ${
            isSuccess ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'
          }`,
          boxShadow:
            btnState === 'success'
              ? `0 0 40px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.2)`
              : `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`,
          cursor: btnState === 'idle' ? 'grab' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Fill Layer */}
        {!isSuccess && !isLoading && (
          <div
            className="absolute top-0 left-0 h-full ease-out transition-transform"
            style={{
              background: `linear-gradient(135deg, ${config.bg}ff, ${config.bg}80)`,
              width: '100%',
              transform: `translateX(${progress - 100}%)`,
              transitionDuration: isDragging ? '0ms' : '300ms',
              boxShadow: `0 0 40px ${config.glow}, inset 0 1px 0 rgba(255,255,255,0.3), inset -2px 0 10px rgba(0,0,0,0.2)`,
            }}
          />
        )}

        {isLoading && (
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
              animation: 'shimmer 1s infinite',
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none drop-shadow-lg">
          <span className="text-[32px] leading-none mb-1 drop-shadow-md">
            {isSuccess ? '✓' : config.icon}
          </span>
          <span className="text-[16px] font-extrabold tracking-widest uppercase">
            {isSuccess ? 'Reported' : isLoading ? 'Sending…' : config.label}
          </span>
          {!isSuccess && !isLoading && (
            <span className="text-[11px] font-bold mt-1 flex items-center gap-1 uppercase tracking-wider animate-sweep">
              Slide to dispatch 
              <span className="animate-pulse ml-1 text-white">→</span>
            </span>
          )}
        </div>

        <ConfirmationPulse key={pulseKey} active={isSuccess} />
      </div>
    </div>
  );
}
