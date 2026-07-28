import React from 'react';
import { Incident } from '../../types';
import { SAFETY_MARKERS } from '../../data/safetyInfrastructure';
import { SafetyMarker } from '../../types';
import { getDistance } from '../../utils/distance';

interface Props {
  incident: Incident;
}

export default function ActionGuideCard({ incident }: Props) {
  if (incident.type !== 'medical' && incident.type !== 'fire') return null;

  // Find nearest appropriate resource
  const relevantTypes = incident.type === 'fire' ? ['extinguisher'] : ['aed', 'first_aid'];
  const candidates = SAFETY_MARKERS.filter(m => relevantTypes.includes(m.type));
  
  let nearestMarker: SafetyMarker | null = null;
  let minDistance = Infinity;

  for (const m of candidates) {
    const dist = getDistance(incident.location, { lat: m.lat, lng: m.lng });
    if (dist < minDistance) {
      minDistance = dist;
      nearestMarker = m;
    }
  }

  const roundedDistance = Math.round(minDistance);

  return (
    <div className="mt-3 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden animate-fade-in-up">
      {incident.type === 'medical' && (
        <div className="bg-red-950/40 p-4 border-b border-red-900/50">
          <div className="flex gap-3">
            <span className="text-3xl animate-pulse text-red-500">🫁</span>
            <div>
              <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-wide">
                CPR Instructions
              </h4>
              <p className="text-red-200 text-sm leading-snug">
                Push hard and fast in the center of the chest. 
                Keep a steady rhythm of <strong>100-120 BPM</strong> (like "Stayin' Alive").
              </p>
            </div>
          </div>
        </div>
      )}

      {nearestMarker && (
        <div className="p-4 bg-gray-900/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl opacity-90">
              {nearestMarker.type === 'aed' ? '🫀' : nearestMarker.type === 'extinguisher' ? '🧯' : '➕'}
            </span>
            <div className="flex-1">
              <h4 className="text-white font-semibold text-sm">
                Nearest {nearestMarker.type === 'aed' ? 'AED' : nearestMarker.type === 'extinguisher' ? 'Fire Extinguisher' : 'First Aid'}
              </h4>
              <p className="text-gray-400 text-xs">
                {roundedDistance}m away · {nearestMarker.locationLabel}
              </p>
            </div>
            {/* The user requested a button to pan/zoom map, but since this card is below the button, 
                and there's no direct map context *here*, we can just make it a visual button for now. 
                The requirements say "View on Map". In StudentView, there isn't actually a map by default for Tier 1.
                Wait, StudentView doesn't have a map. The map is in Warden/Admin.
                So let's just make it a visual pill. */}
            <span className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-1 rounded border border-indigo-800">
              {roundedDistance}m
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
