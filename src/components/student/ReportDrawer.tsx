import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../../store';
import { useGPS } from '../../hooks/useGPS';
import {
  Incident,
  IncidentType,
  generateId,
  getZoneForLocation,
  LatLng,
} from '../../types';

// ── Fix Leaflet default icon paths (Vite bundles break them) ─────────────────
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const VIT_CENTER: LatLng = { lat: 12.8422, lng: 80.155 };

// ── Inner component that listens to map clicks for pin placement ──────────────
function MapPinPlacer({
  position,
  onMove,
}: {
  position: LatLng;
  onMove: (ll: LatLng) => void;
}) {
  // Allow tapping/clicking map to move pin
  useMapEvents({
    click(e) {
      onMove({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  const markerRef = useRef<L.Marker | null>(null);

  return (
    <Marker
      position={[position.lat, position.lng]}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const m = markerRef.current;
          if (m) {
            const ll = m.getLatLng();
            onMove({ lat: ll.lat, lng: ll.lng });
          }
        },
      }}
    />
  );
}

// ── Drawer types ──────────────────────────────────────────────────────────────
type NonUrgentType = 'hazmat' | 'other' | 'elevator';

const TYPE_OPTIONS: { value: NonUrgentType; icon: string; label: string }[] = [
  { value: 'hazmat', icon: '☢️', label: 'Hazmat / Chemical' },
  { value: 'elevator', icon: '🛗', label: 'Elevator Entrapment' },
  { value: 'other',  icon: '⚠️', label: 'Other / Unknown' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function ReportDrawer({ isOpen, onClose }: Props) {
  const { addIncident } = useStore();
  const { getLocation } = useGPS();

  const [type, setType] = useState<NonUrgentType>('other');
  const [description, setDescription] = useState('');
  const [pinLocation, setPinLocation] = useState<LatLng>(VIT_CENTER);
  const [mapReady, setMapReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Elevator specific fields
  const [buildingName, setBuildingName] = useState('');
  const [elevatorNumber, setElevatorNumber] = useState('');
  const [floorRange, setFloorRange] = useState('');

  // Seed GPS into pin when drawer opens
  useEffect(() => {
    if (isOpen && !submitted) {
      getLocation().then((loc) => setPinLocation(loc));
      // Small delay to let the drawer animate in before rendering map
      const t = setTimeout(() => setMapReady(true), 350);
      return () => clearTimeout(t);
    }
    if (!isOpen) {
      setMapReady(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePinMove = useCallback((ll: LatLng) => setPinLocation(ll), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);

    const zone = getZoneForLocation(pinLocation);
    let finalType = type;
    let finalSeverity: 'low' | 'medium' | 'high' | 'critical' = 'pending' as any;
    
    // Attempt AI Classification
    try {
      const res = await fetch('http://localhost:3001/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportText: description.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.type && data.severity) {
          finalType = data.type;
          finalSeverity = data.severity;
          console.log('AI Classification:', data);
        }
      } else {
        // Fallback mock if API key missing or server down
        await new Promise(r => setTimeout(r, 800));
        finalSeverity = 'medium';
      }
    } catch {
      await new Promise(r => setTimeout(r, 800));
      finalSeverity = 'medium';
    }

    const incident: Incident = {
      id: generateId(),
      type: finalType,
      severity: finalSeverity,
      status: 'active',
      zone,
      location: pinLocation,          // user-placed pin
      description: description.trim(),
      reportedBy: 'Student',
      reportedAt: Date.now(),
      updatedAt: Date.now(),
      ...(finalType === 'elevator' && {
        buildingName,
        elevatorNumber,
        floorRange,
      }),
    };

    addIncident(incident);
    setSubmitting(false);
    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      setDescription('');
      setType('other');
      onClose();
    }, 2200);
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* ── Drawer ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[9999] bg-gray-900 border-t border-gray-700/70
          rounded-t-2xl transition-transform duration-300 ease-out`}
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          <h2 className="text-base font-bold text-white mb-1">
            📝 Report an Incident
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Non-urgent only. Use the big buttons above for Fire, Medical, or Security.
          </p>

          {submitted ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="text-5xl">✅</div>
              <p className="text-green-400 font-bold text-lg">Submitted!</p>
              <p className="text-gray-400 text-sm text-center">
                Your report is queued for AI classification.
                <br />
                Authorities have been notified.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* ── Type selector ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Incident Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map(({ value, icon, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                        type === value
                          ? 'bg-indigo-700/60 border-indigo-500 text-white ring-1 ring-indigo-400/40'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      <span className="leading-snug">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Severity badge — always pending */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-600">Severity:</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
                    🤖 Pending AI Classification
                  </span>
                </div>
              </div>

              {type === 'elevator' && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Building</label>
                      <input type="text" value={buildingName} onChange={e => setBuildingName(e.target.value)} required className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500" placeholder="e.g. AB1" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Elevator #</label>
                      <input type="text" value={elevatorNumber} onChange={e => setElevatorNumber(e.target.value)} required className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500" placeholder="e.g. Lift 3" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stuck between floors</label>
                    <input type="text" value={floorRange} onChange={e => setFloorRange(e.target.value)} required className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500" placeholder="e.g. Ground and 1st" />
                  </div>
                </div>
              )}

              {/* ── Pin placement map ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  📍 Drag or tap map to set location
                </label>
                <div
                  className="rounded-xl overflow-hidden ring-1 ring-gray-700"
                  style={{ height: 300 }}
                >
                  {mapReady ? (
                    <MapContainer
                      center={[pinLocation.lat, pinLocation.lng]}
                      zoom={17}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <MapPinPlacer
                        position={pinLocation}
                        onMove={handlePinMove}
                      />
                    </MapContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-800 text-gray-500 text-sm">
                      Loading map…
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {pinLocation.lat.toFixed(5)}, {pinLocation.lng.toFixed(5)}
                </p>
              </div>

              {/* ── Description ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you see — as much detail as possible…"
                  rows={3}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm
                    focus:outline-none focus:border-indigo-500 placeholder-gray-600 resize-none"
                />
              </div>

              {/* ── Submit ── */}
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                  text-white font-bold rounded-xl transition-colors text-base"
              >
                {submitting ? 'Submitting…' : '📤 Submit Report'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
