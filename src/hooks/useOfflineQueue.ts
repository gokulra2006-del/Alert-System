import { useEffect, useState, useCallback, useRef } from 'react';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Incident } from '../types';

const QUEUE_KEY = 'campus_alert_offline_queue';

function readQueue(): Incident[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: Incident[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(() => readQueue().length);
  const [isFlushing, setIsFlushing] = useState(false);
  const flushedRef = useRef(false);

  // Flush queued incidents to Firestore in chronological order
  const flushQueue = useCallback(async () => {
    if (flushedRef.current) return;
    const queue = readQueue();
    if (queue.length === 0) return;

    flushedRef.current = true;
    setIsFlushing(true);
    console.log(`[OfflineQueue] Flushing ${queue.length} queued incident(s)...`);

    // Sort by original reportedAt timestamp (chronological order)
    const sorted = [...queue].sort((a, b) => a.reportedAt - b.reportedAt);

    for (const incident of sorted) {
      try {
        await setDoc(doc(db, 'incidents', incident.id), incident);
        console.log(`[OfflineQueue] Flushed incident ${incident.id}`);
      } catch (e) {
        console.error(`[OfflineQueue] Failed to flush incident ${incident.id}:`, e);
      }
    }

    // Clear the queue
    writeQueue([]);
    setQueuedCount(0);
    setIsFlushing(false);
    flushedRef.current = false;
    console.log('[OfflineQueue] Queue cleared.');
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // On mount, if online and there's a queue, flush immediately
    if (navigator.onLine) {
      flushQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue]);

  // Enqueue an incident for later sync
  const queueIncident = useCallback((incident: Incident) => {
    const queue = readQueue();
    queue.push(incident);
    writeQueue(queue);
    setQueuedCount(queue.length);
    console.log(`[OfflineQueue] Queued incident ${incident.id}. Total: ${queue.length}`);
  }, []);

  return { isOnline, queuedCount, queueIncident, isFlushing };
}
