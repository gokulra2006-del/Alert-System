import React, { useState, useEffect, useRef } from 'react';
import { StoreProvider, useStore } from './store';
import { useSimulator } from './hooks/useSimulator';
import StudentView from './components/student/StudentView';
import WardenView from './views/WardenView';
import AdminView from './views/AdminView';
import LoginView from './components/auth/LoginView';

// ── Unified Top Navigation ──────────────────────────────────────────────────
function TopNav() {
  const { state, logout } = useStore();
  const user = state.currentUser;
  
  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const activeCount = state.incidents.filter(i => !i.isMerged && ['active', 'acknowledged'].includes(i.status)).length;

  return (
    <header className="sticky top-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-md border-b border-gray-800 shadow-lg px-4 sm:px-6 py-3 flex items-center justify-between">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center text-lg shadow-inner">
          🏫
        </div>
        <div className="flex flex-col">
          <h1 className="text-white font-bold text-sm tracking-tight leading-tight">
            Campus Command Center
          </h1>
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest leading-tight">
            VIT Chennai
          </span>
        </div>
      </div>

      {/* Right: Active Count & User Menu */}
      <div className="flex items-center gap-4">
        {/* Active Incident Badge (Only for Admin/Warden ideally, but good for situational awareness) */}
        {activeCount > 0 && user.role !== 'student' && (
          <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-900/50 px-2.5 py-1 rounded-md shadow-sm">
            <span className="stat-blink w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-red-400 text-[10px] font-bold tracking-wider">{activeCount} ACTIVE</span>
          </div>
        )}

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-white leading-none mb-0.5">
              {user.name}
            </span>
            <span className="text-[10px] text-gray-400 leading-none uppercase tracking-wider font-semibold">
              {user.role} {user.zone ? `· ${user.zone}` : ''}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[12px] font-bold shadow-md border border-indigo-500">
            {user.name.charAt(0)}
          </div>
          
          <div className="w-px h-6 bg-gray-700/50 mx-1"></div>
          
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-500/50 rounded-lg transition-all text-xs font-bold tracking-wide"
            title="Sign Out"
          >
            <span>⏏</span>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// ── App Wrapper with Ambient Threat Background ────────────────────────────────
function SimulatedApp() {
  useSimulator(false);
  const { state } = useStore();
  const role = state.currentUser?.role;

  // Calculate highest active threat
  const activeIncidents = state.incidents.filter(i => i.status === 'active');
  const hasCritical = activeIncidents.some(i => i.severity === 'critical');
  const hasHigh = activeIncidents.some(i => i.severity === 'high');

  // Ambient gradient based on threat level
  const ambientBackground = hasCritical
    ? 'radial-gradient(circle at top, #3f0f15 0%, #0a0e1a 60%)' // Deep crimson glow
    : hasHigh
    ? 'radial-gradient(circle at top, #3f2a0b 0%, #0a0e1a 60%)' // Amber glow
    : '#0a0e1a'; // Normal deep blue

  return (
    <div 
      className="relative min-h-screen flex flex-col transition-all duration-1000 ease-in-out"
      style={{ background: ambientBackground }}
    >
      <TopNav />
      <div className="flex-1 relative z-10">
        {role === 'student' && <StudentView />}
        {role === 'warden' && <WardenView />}
        {role === 'admin'   && <AdminView />}
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
function AppContent() {
  const { state } = useStore();
  
  if (!state.isFirebaseReady) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center text-2xl">
            🏫
          </div>
          <p className="text-gray-500 text-sm font-medium">Checking session...</p>
        </div>
      </div>
    );
  }
  
  if (!state.currentUser) {
    return <LoginView />;
  }
  
  return <SimulatedApp />;
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
