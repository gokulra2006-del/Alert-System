import React from 'react';
import { Zone } from '../../types';

interface Props {
  lockedZones: Zone[];
}

/**
 * Full-screen red lockdown overlay.
 * Rendered on top of StudentView and WardenView whenever any zone is locked down.
 */
export default function LockdownBanner({ lockedZones }: Props) {
  if (lockedZones.length === 0) return null;

  const names = lockedZones.map((z) => z.shortName).join(', ');

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center px-6"
      style={{
        background: 'rgba(127, 0, 0, 0.92)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Pulsing icon */}
      <div className="text-6xl mb-4 stat-blink">🔒</div>

      <h1 className="text-3xl font-black text-white tracking-tight mb-2">
        LOCKDOWN
      </h1>

      <p className="text-red-200 font-semibold text-lg mb-1">
        Shelter in place. Lock doors.
      </p>
      <p className="text-red-300 text-base mb-4">
        Stay away from windows. Do not leave the building.
      </p>

      <div className="bg-red-950/60 border border-red-700 rounded-xl px-5 py-3 mb-5 max-w-sm">
        <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">
          Affected Zones
        </p>
        <p className="text-white font-bold text-sm">{names}</p>
      </div>

      {/* Nearest safety points reminder */}
      <div className="bg-black/40 border border-red-900 rounded-xl px-4 py-3 max-w-sm text-left">
        <p className="text-xs text-red-300 font-semibold mb-1.5">
          📍 Nearest Safety Resources
        </p>
        {lockedZones.map((z) => (
          <div key={z.id} className="text-xs text-red-200 mb-1">
            <strong>{z.shortName}</strong> Assembly Point:{' '}
            {z.assemblyPoint.lat.toFixed(4)}, {z.assemblyPoint.lng.toFixed(4)}
          </div>
        ))}
      </div>

      <p className="text-red-400 text-xs mt-6">
        Await further instructions from campus authorities
      </p>
    </div>
  );
}
