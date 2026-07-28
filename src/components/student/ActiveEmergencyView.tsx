import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { IncidentType } from '../../types';
import MediaCapture from './MediaCapture';
import { SAFETY_MARKERS } from '../../data/safetyInfrastructure';
import { useGPS } from '../../hooks/useGPS';

// Helper for Haversine distance in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

interface Props {
  incidentId: string;
  type: IncidentType;
  onResolve: () => void;
}

export default function ActiveEmergencyView({ incidentId, type, onResolve }: Props) {
  const { state } = useStore();
  const { getLocation } = useGPS();
  const incident = state.incidents.find(i => i.id === incidentId);

  const [precautions, setPrecautions] = useState<string[]>([]);
  const [loadingPrecautions, setLoadingPrecautions] = useState(true);
  
  const [nearestEquipment, setNearestEquipment] = useState<any[]>([]);

  // Fetch AI Precautions
  useEffect(() => {
    let mounted = true;
    async function fetchPrecautions() {
      try {
        const res = await fetch('http://localhost:3001/api/ai/precautions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emergencyType: type })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (mounted) setPrecautions(data.precautions || []);
        } else {
          throw new Error('API failed');
        }
      } catch (err) {
        // Fallback simulated precautions
        if (mounted) {
          await new Promise(r => setTimeout(r, 1000));
          if (type === 'fire') {
            setPrecautions(['Evacuate immediately using the nearest stairs.', 'Do not use elevators.', 'Stay low if there is smoke.']);
          } else if (type === 'medical') {
            setPrecautions(['Ensure the area is safe for you and the victim.', 'Do not move the victim unless in immediate danger.', 'Prepare to assist responders and fetch an AED if nearby.']);
          } else if (type === 'security') {
            setPrecautions(['Find a safe, secure location and lock the door if possible.', 'Stay quiet and silence your mobile device.', 'Do not confront the threat.']);
          } else {
            setPrecautions(['Move to a safe distance.', 'Await further instructions from authorities.', 'Do not interfere with responders.']);
          }
        }
      } finally {
        if (mounted) setLoadingPrecautions(false);
      }
    }
    fetchPrecautions();
    return () => { mounted = false; };
  }, [type]);

  // Find Nearest Equipment
  useEffect(() => {
    async function findEquipment() {
      try {
        const loc = await getLocation();
        const withDistances = SAFETY_MARKERS.map(marker => {
          const dist = calculateDistance(loc.lat, loc.lng, marker.lat, marker.lng);
          return { ...marker, distance: dist };
        });
        withDistances.sort((a, b) => a.distance - b.distance);
        setNearestEquipment(withDistances.slice(0, 2)); // Top 2 nearest
      } catch (err) {
        console.error('Could not get GPS for equipment', err);
      }
    }
    findEquipment();
  }, [getLocation]);

  const headerColors = {
    fire: 'bg-red-600',
    medical: 'bg-blue-600',
    security: 'bg-amber-600',
    hazmat: 'bg-purple-600',
    elevator: 'bg-indigo-600',
    other: 'bg-gray-600'
  };

  const headerIcons = {
    fire: '🔥',
    medical: '🏥',
    security: '🛡️',
    hazmat: '☢️',
    elevator: '🛗',
    other: '⚠️'
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0e1a] flex flex-col animate-fade-in-up overflow-y-auto">
      {/* Header */}
      <div className={`${headerColors[type] || headerColors.other} text-white px-6 py-8 flex flex-col items-center justify-center shadow-lg relative`}>
        <div className="text-5xl mb-2 animate-bounce">{headerIcons[type] || headerIcons.other}</div>
        <h1 className="text-2xl font-black uppercase tracking-widest text-center">
          {type} Emergency Active
        </h1>
        <p className="text-white/80 text-sm mt-2 font-medium">Rescue teams have been dispatched.</p>
        
        <button 
          onClick={onResolve}
          className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full px-4 py-2 transition-all z-50 backdrop-blur-sm shadow-lg border border-white/20 font-bold tracking-wide"
        >
          <span>✕</span> Close
        </button>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-6 max-w-lg mx-auto w-full pb-20 relative">
        
        {/* Media Capture Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span>📷</span> Evidence Collection
          </h2>
          <MediaCapture incidentId={incidentId} onDismiss={() => {}} />
        </div>

        {/* AI Precautions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20 text-4xl">✨</div>
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="text-indigo-400">✨</span> Immediate Precautions
          </h2>
          
          {loadingPrecautions ? (
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-3/4"></div>
              <div className="h-4 bg-gray-800 rounded w-5/6"></div>
              <div className="h-4 bg-gray-800 rounded w-2/3"></div>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {precautions.map((p, i) => (
                <li key={i} className="flex gap-3 text-gray-300 text-sm leading-relaxed">
                  <span className="text-indigo-500 font-bold mt-0.5">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Nearby Equipment */}
        {nearestEquipment.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <span>🧰</span> Nearest Safety Equipment
            </h2>
            <div className="flex flex-col gap-3">
              {nearestEquipment.map((eq, i) => (
                <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 flex items-start gap-3">
                  <div className="text-2xl mt-1">
                    {eq.type === 'aed' ? '⚡' : eq.type === 'extinguisher' ? '🧯' : '🚑'}
                  </div>
                  <div>
                    <h3 className="text-gray-200 font-bold text-sm">
                      {eq.type === 'aed' ? 'AED (Defibrillator)' : eq.type === 'extinguisher' ? 'Fire Extinguisher' : 'First Aid Kit'}
                    </h3>
                    <p className="text-gray-400 text-xs mt-1">{eq.locationLabel}</p>
                    <p className="text-indigo-400 font-bold text-xs mt-1">{Math.round(eq.distance)}m away</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
