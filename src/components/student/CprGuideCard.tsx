import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { SAFETY_MARKERS } from '../../data/safetyInfrastructure';
import { findNearestMarker } from '../../utils/geo';
import MediaCapture from './MediaCapture';
import AudioCapture from './AudioCapture';
import { SafetyItemType, Incident } from '../../types';

interface Props {
  incidentId: string;
  onDismiss: () => void;
}

export default function CprGuideCard({ incidentId, onDismiss }: Props) {
  const { state } = useStore();
  const incident = state.incidents.find((i) => i.id === incidentId);
  const [nearestAed, setNearestAed] = useState<{ marker: any; distance: number } | null>(null);
  const [isPerformingCpr, setIsPerformingCpr] = useState<boolean | null>(null);

  useEffect(() => {
    if (incident) {
      const nearest = findNearestMarker(incident.location, SAFETY_MARKERS, 'aed');
      setNearestAed(nearest);
    }
  }, [incident]);

  if (!incident) return null;

  return (
    <div className="mt-3 bg-gray-900/90 border border-gray-700 rounded-xl p-4 shadow-xl animate-fade-in">
      <div className="flex items-start gap-3 border-b border-gray-800 pb-3 mb-3">
        <span className="text-3xl">🫀</span>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg leading-tight text-red-500">MEDICAL EMERGENCY</h3>
          <p className="text-white text-sm font-medium mt-1">
            <strong>Begin CPR:</strong> Push hard and fast, center of chest, 100-120 BPM.
          </p>
        </div>
      </div>

      {nearestAed && (
        <div className="flex items-center gap-2 bg-indigo-950/40 p-2 rounded-lg border border-indigo-900/50 mb-4">
          <span className="text-lg">⚡</span>
          <div>
            <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Nearest AED</p>
            <p className="text-sm text-white font-medium">{nearestAed.marker.locationLabel} ({nearestAed.distance}m away)</p>
          </div>
        </div>
      )}

      {isPerformingCpr === null ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-300 font-medium text-center mb-1">Are you performing CPR?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPerformingCpr(true)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors"
            >
              YES
            </button>
            <button
              onClick={() => setIsPerformingCpr(false)}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-sm transition-colors"
            >
              NO
            </button>
          </div>
        </div>
      ) : isPerformingCpr ? (
        <div className="text-center p-2">
          <p className="text-sm text-green-400 font-bold">Please continue CPR. Help is on the way.</p>
          {/* Hands are busy, capture audio only silently in background */}
          <AudioCapture incidentId={incidentId} />
        </div>
      ) : (
        <div className="mt-2">
          {/* Hands are free, prompt for video */}
          <MediaCapture incidentId={incidentId} onDismiss={onDismiss} />
        </div>
      )}
    </div>
  );
}
