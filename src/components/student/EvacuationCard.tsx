import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { SAFETY_MARKERS } from '../../data/safetyInfrastructure';
import { findNearestMarker } from '../../utils/geo';
import AudioCapture from './AudioCapture';
import { ZONES } from '../../types';

interface Props {
  incidentId: string;
}

export default function EvacuationCard({ incidentId }: Props) {
  const { state } = useStore();
  const incident = state.incidents.find((i) => i.id === incidentId);
  const [nearestExtinguisher, setNearestExtinguisher] = useState<{ marker: any; distance: number } | null>(null);

  useEffect(() => {
    if (incident) {
      const nearest = findNearestMarker(incident.location, SAFETY_MARKERS, 'extinguisher');
      setNearestExtinguisher(nearest);
    }
  }, [incident]);

  if (!incident) return null;

  const zoneData = ZONES.find(z => z.id === incident.zone);
  const assemblyPointName = zoneData ? `${zoneData.name} Assembly Area` : 'Nearest Assembly Point';

  return (
    <div className="mt-3 bg-red-950/90 border border-red-700 rounded-xl p-4 shadow-xl animate-fade-in relative overflow-hidden">
      {/* Background strobe effect */}
      <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />

      <div className="flex items-start gap-3 relative z-10 border-b border-red-900/50 pb-3 mb-3">
        <span className="text-3xl">🔥</span>
        <div className="flex-1">
          <h3 className="text-white font-black text-lg leading-tight uppercase tracking-wider text-red-400">
            REPORTED. EVACUATE NOW.
          </h3>
          <p className="text-white text-sm font-medium mt-1">
            Evacuate immediately to: <br/>
            <span className="text-green-400 font-bold">{assemblyPointName}</span>
          </p>
        </div>
      </div>

      {nearestExtinguisher && (
        <div className="flex items-center gap-2 bg-gray-900/60 p-2 rounded-lg border border-gray-700 relative z-10 mb-2">
          <span className="text-lg">🧯</span>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Nearest Extinguisher</p>
            <p className="text-sm text-white font-medium">{nearestExtinguisher.marker.locationLabel} ({nearestExtinguisher.distance}m away)</p>
          </div>
        </div>
      )}
      
      <p className="text-xs text-red-300 font-medium text-center mt-3 relative z-10">
        Follow the dashed route on the map above.
      </p>

      {/* Auto-starts audio capture silently */}
      <AudioCapture incidentId={incidentId} durationMs={30000} />
    </div>
  );
}
