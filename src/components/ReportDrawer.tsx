import React, { useState } from 'react';
import { useStore } from '../store';
import { useGPS } from '../hooks/useGPS';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import {
  Incident,
  IncidentType,
  Severity,
  ZoneId,
  generateId,
  getZoneForLocation,
} from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportDrawer({ isOpen, onClose }: Props) {
  const { addIncident } = useStore();
  const { getLocation } = useGPS();
  const { isOnline, queueIncident } = useOfflineQueue();

  const [type, setType] = useState<IncidentType>('other');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    const loc = await getLocation();
    const zone: ZoneId | null = getZoneForLocation(loc);

    const incident: Incident = {
      id: generateId(),
      type,
      severity,
      status: 'active',
      zone,
      location: loc,
      description: description.trim(),
      reportedBy: 'Student',
      reportedAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (isOnline) {
      addIncident(incident);
    } else {
      queueIncident(incident);
    }
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setDescription('');
      setType('other');
      setSeverity('medium');
      onClose();
    }, 2000);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 rounded-t-2xl p-6 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-5" />

        <h2 className="text-lg font-bold text-white mb-5">
          📝 Report an Incident
        </h2>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="text-5xl">✅</div>
            <p className="text-green-400 font-semibold text-lg">
              Incident Reported!
            </p>
            <p className="text-gray-400 text-sm">
              Authorities have been notified.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Type */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Incident Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['fire', '🔥 Fire'],
                    ['medical', '🏥 Medical'],
                    ['security', '🛡️ Security'],
                    ['other', '⚠️ Other'],
                  ] as [IncidentType, string][]
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setType(val)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      type === val
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Severity
              </label>
              <div className="flex gap-2">
                {(
                  [
                    ['low', '🟢 Low'],
                    ['medium', '🟡 Medium'],
                    ['high', '🟠 High'],
                    ['critical', '🔴 Critical'],
                  ] as [Severity, string][]
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSeverity(val)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      severity === val
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Description (Describe the emergency)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g. Someone collapsed in the library and isn't breathing!"
                rows={3}
                required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting || !description.trim()}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    const res = await fetch('/api/ai/classify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reportText: description }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.type) setType(data.type);
                      if (data.severity) setSeverity(data.severity);
                    }
                  } catch (e) {
                    console.error('AI Classification failed', e);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="flex-1 py-3.5 bg-indigo-900/50 hover:bg-indigo-800 text-indigo-300 border border-indigo-700/50 disabled:opacity-50 font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                ✨ Auto-Classify
              </button>
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-base"
              >
                {submitting ? 'Working…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
