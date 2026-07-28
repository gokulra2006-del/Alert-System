import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import {
  Incident, BroadcastMessage, Zone, ZoneId, BuildingStatus,
  generateId, ZONES as INITIAL_ZONES, User, CheckInRecord, DEMO_USERS, CheckInRequest, TimelineEntry
} from './types';

interface State {
  currentUser: User | null;
  incidents: Incident[];
  broadcasts: BroadcastMessage[];
  zones: Zone[];
  checkIns: CheckInRecord[];
  checkInRequests: CheckInRequest[];
  isFirebaseReady: boolean;
}

interface StoreContextValue {
  state: State;
  login: (user: User) => void;
  logout: () => void;
  addIncident: (inc: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  resolveIncident: (id: string) => void;
  addBroadcast: (msg: BroadcastMessage) => void;
  setZoneLockdown: (zoneId: ZoneId, value: boolean) => void;
  setBuildingStatus: (zoneId: ZoneId, status: BuildingStatus) => void;
  addCheckIn: (record: CheckInRecord) => void;
  addCheckInRequest: (request: CheckInRequest) => void;
  logTimelineEvent: (incidentId: string, entry: Omit<TimelineEntry, 'id'>) => Promise<void>;
  // Kept for type compatibility, though simulator logic should be disabled or adapted
  injectDemoIncidents: (incidents: Incident[]) => void;
  clearAllIncidents: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [checkInRequests, setCheckInRequests] = useState<CheckInRequest[]>([]);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch custom user profile from Firestore 'users' collection
        // For the hackathon demo, if not found, we fallback to finding from DEMO_USERS
        let profile = DEMO_USERS.find(u => u.email === firebaseUser.email);
        
        // Normally we'd query Firestore:
        // const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
        // const snapshot = await getDocs(q);
        // if (!snapshot.empty) profile = snapshot.docs[0].data() as User;

        if (profile) {
          setCurrentUser(profile);
          localStorage.setItem('crisis_map_session', JSON.stringify(profile));
        }
      } else {
        const localSession = localStorage.getItem('crisis_map_session');
        if (localSession) {
          setCurrentUser(JSON.parse(localSession));
        } else {
          setCurrentUser(null);
        }
      }
      setIsFirebaseReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Listeners (only when logged in)
  useEffect(() => {
    if (!currentUser) return;

    // Incidents Listener
    let incidentsQuery = collection(db, 'incidents') as any;
    if (currentUser.role === 'warden' && currentUser.zone) {
      incidentsQuery = query(collection(db, 'incidents'), where('zone', '==', currentUser.zone));
    }
    
    const unsubIncidents = onSnapshot(incidentsQuery, (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Incident));
      // Sort by reportedAt descending
      data.sort((a: Incident, b: Incident) => b.reportedAt - a.reportedAt);
      setIncidents(data);
    });

    // Broadcasts Listener
    const unsubBroadcasts = onSnapshot(collection(db, 'broadcasts'), (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as BroadcastMessage));
      data.sort((a: BroadcastMessage, b: BroadcastMessage) => b.sentAt - a.sentAt);
      setBroadcasts(data);
    });

    // Zones Listener
    const unsubZones = onSnapshot(collection(db, 'zones'), (snapshot: any) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map((doc: any) => {
          const d = doc.data();
          return {
            ...d,
            id: doc.id,
            polygon: typeof d.polygon === 'string' ? JSON.parse(d.polygon) : d.polygon
          } as Zone;
        });
        setZones(data);
      }
    });

    // CheckInRequests Listener
    let checkInReqQuery = collection(db, 'checkInRequests') as any;
    if (currentUser.role === 'student' && currentUser.zone) {
      checkInReqQuery = query(collection(db, 'checkInRequests'), where('zoneId', 'in', [currentUser.zone, 'all']));
    }
    const unsubCheckInReqs = onSnapshot(checkInReqQuery, (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as CheckInRequest));
      setCheckInRequests(data);
    });

    // SafetyChecks Listener (Admins only)
    let unsubCheckIns = () => {};
    if (currentUser.role === 'admin') {
      unsubCheckIns = onSnapshot(collection(db, 'safetyChecks'), (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as CheckInRecord));
        setCheckIns(data);
      });
    }

    return () => {
      unsubIncidents();
      unsubBroadcasts();
      unsubZones();
      unsubCheckIns();
    };
  }, [currentUser]);

  // Actions
  const login = useCallback((user: User) => {
    // Replaced by Firebase Auth, but kept for signature compatibility
    setCurrentUser(user);
    localStorage.setItem('crisis_map_session', JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('crisis_map_session');
    setCurrentUser(null);
    signOut(auth);
  }, []);

  const logTimelineEvent = useCallback(async (incidentId: string, entry: Omit<TimelineEntry, 'id'>) => {
    try {
      await addDoc(collection(db, 'incidents', incidentId, 'timeline'), {
        ...entry,
        id: generateId(),
      });
    } catch (e) {
      console.warn('Failed to log timeline event:', e);
    }
  }, []);

  const addIncident = useCallback(async (inc: Incident) => {
    // Write to Firestore using the generated ID as document ID
    await setDoc(doc(db, 'incidents', inc.id), inc);
    // Log timeline event
    await logTimelineEvent(inc.id, {
      action: 'created',
      actorId: inc.reportedBy,
      actorName: inc.reportedBy,
      timestamp: inc.reportedAt,
      newStatus: inc.status,
    });
  }, [logTimelineEvent]);

  const updateIncident = useCallback(async (id: string, updates: Partial<Incident>) => {
    await updateDoc(doc(db, 'incidents', id), { ...updates, updatedAt: Date.now() });
    // Log timeline event based on the update type
    const currentInc = incidents.find(i => i.id === id);
    let action: TimelineEntry['action'] = 'updated';
    if (updates.status === 'acknowledged') action = 'acknowledged';
    else if (updates.isEscalated) action = 'escalated';
    else if (updates.responderResource) action = 'resource_assigned';
    
    await logTimelineEvent(id, {
      action,
      actorId: updates.acknowledgedBy || 'system',
      actorName: updates.acknowledgedBy || 'System',
      timestamp: Date.now(),
      previousStatus: currentInc?.status,
      newStatus: updates.status || currentInc?.status,
      notes: updates.notes,
    });
  }, [logTimelineEvent, incidents]);

  const resolveIncident = useCallback(async (id: string) => {
    const currentInc = incidents.find(i => i.id === id);
    await updateDoc(doc(db, 'incidents', id), {
      status: 'resolved',
      responseEndTime: Date.now(),
      updatedAt: Date.now()
    });
    await logTimelineEvent(id, {
      action: 'resolved',
      actorId: 'warden',
      actorName: 'Warden',
      timestamp: Date.now(),
      previousStatus: currentInc?.status,
      newStatus: 'resolved',
    });
  }, [logTimelineEvent, incidents]);

  const addBroadcast = useCallback(async (msg: BroadcastMessage) => {
    await setDoc(doc(db, 'broadcasts', msg.id), msg);
  }, []);

  const setZoneLockdown = useCallback(async (zoneId: ZoneId, value: boolean) => {
    await updateDoc(doc(db, 'zones', zoneId), { isLockdown: value });
  }, []);

  const setBuildingStatus = useCallback(async (zoneId: ZoneId, status: BuildingStatus) => {
    await updateDoc(doc(db, 'zones', zoneId), { buildingStatus: status });
  }, []);

  const addCheckIn = useCallback(async (record: CheckInRecord) => {
    // Use userId as doc ID to ensure uniqueness/overwrites
    await setDoc(doc(db, 'checkIns', record.userId), record);
  }, []);

  const injectDemoIncidents = useCallback((newIncidents: Incident[]) => {
    newIncidents.forEach(inc => setDoc(doc(db, 'incidents', inc.id), inc));
  }, []);

  const clearAllIncidents = useCallback(async () => {
    const q = query(collection(db, 'incidents'));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    
    // Also clear broadcasts to completely reset the system
    const bq = query(collection(db, 'broadcasts'));
    const bSnapshot = await getDocs(bq);
    bSnapshot.docs.forEach((d) => batch.delete(d.ref));
    
    await batch.commit();
  }, []);

  const addCheckInRequest = useCallback(async (request: CheckInRequest) => {
    await setDoc(doc(db, 'checkInRequests', request.id), request);
  }, []);

  const state: State = {
    currentUser,
    incidents,
    broadcasts,
    zones,
    checkIns,
    checkInRequests,
    isFirebaseReady,
  };

  return (
    <StoreContext.Provider
      value={{
        state, login, logout, addIncident, updateIncident, resolveIncident,
        addBroadcast, setZoneLockdown, setBuildingStatus,
        injectDemoIncidents, clearAllIncidents, addCheckIn, addCheckInRequest,
        logTimelineEvent,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
