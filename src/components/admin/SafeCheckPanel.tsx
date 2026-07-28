import React, { useState } from 'react';
import { useStore } from '../../store';
import { DEMO_USERS } from '../../types';

export default function SafeCheckPanel() {
  const { state } = useStore();
  const [expanded, setExpanded] = useState(false);

  // Real users that are students
  const realStudents = DEMO_USERS.filter((u) => u.role === 'student');
  const realCheckedInCount = state.checkIns.length;
  
  // Simulated totals to make it look realistic (15 seed + real students)
  const TOTAL_STUDENTS = 147 + realStudents.length;
  // 142 from simulation + the number of real check-ins
  const SAFE_COUNT = 142 + realCheckedInCount;
  const UNACCOUNTED_COUNT = TOTAL_STUDENTS - SAFE_COUNT;

  // We show a mix of unaccounted simulated students + unaccounted real students
  const checkedInRealIds = new Set(state.checkIns.map(c => c.userId));
  const unaccountedReal = realStudents.filter(s => !checkedInRealIds.has(s.id)).map(s => ({
    id: s.id, name: s.name, status: 'unaccounted'
  }));

  const simulatedUnaccounted = [
    { id: '21BCE0001', name: 'Raj Kumar' },
    { id: '21BCE0002', name: 'Priya Sharma' },
    { id: '21BCE0003', name: 'Amit Singh' },
  ];
  const allUnaccounted = [...unaccountedReal, ...simulatedUnaccounted];

  const safePct = Math.round((SAFE_COUNT / TOTAL_STUDENTS) * 100);

  return (
    <div className="bg-gray-900 border border-amber-800/60 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">✅</span>
          <div>
            <h3 className="text-sm font-bold text-white">I'm Safe — Check-In</h3>
            <p className="text-xs text-gray-500">Live roster status</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {UNACCOUNTED_COUNT > 0 && (
            <span className="stat-blink text-xs font-bold px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-700 text-amber-300">
              {UNACCOUNTED_COUNT} unaccounted
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>
            <strong className="text-green-400">{SAFE_COUNT}</strong> / {TOTAL_STUDENTS} students confirmed safe
          </span>
          <span>{safePct}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${safePct}%`,
              background: 'linear-gradient(90deg, #16a34a, #22c55e)',
            }}
          />
        </div>
      </div>

      {/* Status breakdown */}
      <div className="flex gap-3 text-xs mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-400">{SAFE_COUNT} Safe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 stat-blink" />
          <span className="text-gray-400">{UNACCOUNTED_COUNT} Unaccounted</span>
        </div>
      </div>

      {/* Unaccounted list toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        {expanded ? 'Hide' : 'Show'} unaccounted students
      </button>

      {expanded && (
        <div className="mt-2 bg-gray-800/60 rounded-lg p-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          {allUnaccounted.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 stat-blink flex-shrink-0" />
              <span className="text-amber-200 font-medium">{s.name}</span>
              <span className="text-gray-600 ml-auto">{s.id}</span>
            </div>
          ))}
          <p className="text-xs text-gray-600 mt-1 border-t border-gray-700 pt-1">
            +{UNACCOUNTED_COUNT - allUnaccounted.length} more not yet reported
          </p>
        </div>
      )}
    </div>
  );
}
