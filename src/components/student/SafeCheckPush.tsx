import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { generateId } from '../../types';

export default function SafeCheckPush() {
  const { state, addCheckIn } = useStore();
  const [visible, setVisible] = useState(false);
  
  const user = state.currentUser;
  
  // Check if there's a security incident or lockdown in the user's zone
  useEffect(() => {
    if (user?.role !== 'student' || !user.zone) {
      setVisible(false);
      return;
    }

    const zoneId = user.zone;
    
    const zoneLocked = state.zones.find(z => z.id === zoneId)?.isLockdown;
    const activeSecurity = state.incidents.find(
      i => i.zone === zoneId && i.type === 'security' && i.status === 'active'
    );

    const hasCheckedIn = state.checkIns.some(c => c.userId === user.id);

    if ((zoneLocked || activeSecurity) && !hasCheckedIn) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [state.incidents, state.zones, state.checkIns, user]);

  if (!visible || !user || !user.zone) return null;

  const handleSafeCheck = () => {
    addCheckIn({
      id: generateId(),
      userId: user.id,
      zoneId: user.zone!,
      timestamp: Date.now(),
    });
    setVisible(false);
  };

  return (
    <div className="relative z-50 animate-fade-in-down w-full max-w-[600px] mx-auto">
      <div className="bg-amber-950/90 border border-amber-600 rounded-2xl p-4 shadow-2xl backdrop-blur flex flex-col gap-3">
        <div className="flex gap-3 items-start">
          <div className="bg-amber-600/20 p-2 rounded-full text-amber-500">
            <span className="text-xl">🛡️</span>
          </div>
          <div>
            <h3 className="text-amber-400 font-bold text-sm">Security Alert near {user.zone.toUpperCase()}</h3>
            <p className="text-amber-200 text-xs mt-1 leading-snug">
              A security incident has been reported in your zone. Please confirm your safety.
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-1">
          <button
            onClick={handleSafeCheck}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-green-900/30"
          >
            I'm Safe
          </button>
          <button
            onClick={() => setVisible(false)}
            className="px-4 py-2.5 bg-gray-900/50 hover:bg-gray-800 text-gray-400 text-sm font-medium rounded-xl transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
