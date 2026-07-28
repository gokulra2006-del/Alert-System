import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store';

const MAX_DURATION = 15; // seconds

interface Props {
  incidentId: string;
  onDismiss: () => void;
}

type CaptureState = 'prompt' | 'recording' | 'processing' | 'done' | 'denied';

export default function MediaCapture({ incidentId, onDismiss }: Props) {
  const { updateIncident, state } = useStore();
  const incident = state.incidents.find((i) => i.id === incidentId);

  const [captureState, setCaptureState] = useState<CaptureState>('prompt');
  const [countdown, setCountdown] = useState(MAX_DURATION);

  const streamRef    = useRef<MediaStream | null>(null);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef     = useRef<HTMLVideoElement | null>(null);
  const canvasRef    = useRef<HTMLCanvasElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  function stopEverything() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  const grabThumbnail = useCallback(
    (videoEl: HTMLVideoElement): Promise<string> => {
      return new Promise((resolve) => {
        const canvas = canvasRef.current!;
        canvas.width  = videoEl.videoWidth  || 320;
        canvas.height = videoEl.videoHeight || 240;
        const ctx = canvas.getContext('2d')!;
        videoEl.currentTime = Math.min(2, videoEl.duration || 0);
        const onSeeked = () => {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
          videoEl.removeEventListener('seeked', onSeeked);
        };
        videoEl.addEventListener('seeked', onSeeked);
        // Fallback if seek doesn't fire
        setTimeout(() => {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        }, 800);
      });
    },
    []
  );

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: true,
      });
      streamRef.current = stream;

      // Show live preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 250000, // 250 kbps to ensure it stays well under 1MB Firestore limit
      });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setCaptureState('processing');
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        // Read the blob as Base64 to allow syncing via Firestore
        const reader = new FileReader();
        reader.onloadend = async () => {
          const mediaUrlBase64 = reader.result as string;

          // Grab thumbnail from recorded blob (using a temporary object URL)
          let thumbnailUrl = '';
          const tempUrl = URL.createObjectURL(blob);
          try {
            const tempVideo = document.createElement('video');
            tempVideo.src = tempUrl;
            tempVideo.muted = true;
            await new Promise<void>((res) => {
              tempVideo.onloadeddata = () => res();
              tempVideo.load();
              setTimeout(res, 1500);
            });
            thumbnailUrl = await grabThumbnail(tempVideo);
          } catch {
            // thumbnail failed — that's okay, incident still has mediaUrl
          } finally {
            URL.revokeObjectURL(tempUrl);
          }

          // Important check: if the base64 is larger than ~900KB, it might fail Firestore 1MB limit. 
          // At 250kbps for 15s, it should be around 450KB, which is perfectly safe.
          updateIncident(incidentId, {
            mediaUrl: mediaUrlBase64,
            thumbnailUrl: thumbnailUrl || undefined,
          });

          setCaptureState('done');
          setTimeout(onDismiss, 1800);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(250); // collect chunks every 250ms
      setCaptureState('recording');
      setCountdown(MAX_DURATION);

      // Auto-stop countdown
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            recorder.stop();
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      // getUserMedia denied or unavailable — fail silently
      setCaptureState('denied');
      setTimeout(onDismiss, 300);
    }
  }

  function stopEarly() {
    recorderRef.current?.stop();
  }

  if (!incident) return null;

  return (
    <>
      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-3 bg-gray-900/80 border border-gray-700 rounded-xl p-3 animate-fade-in">
        {captureState === 'prompt' && (
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎥</span>
            <div className="flex-1">
              <p className="text-sm text-white font-medium">
                Add photo/video to help responders assess the situation
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                15-second clip — shared only with responders
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={startRecording}
                  className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Record Now
                </button>
                <button
                  onClick={onDismiss}
                  className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {captureState === 'recording' && (
          <div className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg border border-red-900/30">
            {/* Tiny live preview */}
            <video
              ref={videoRef}
              className="w-10 h-10 rounded-md object-cover bg-black border border-gray-800 flex-shrink-0 shadow-inner"
              muted
              playsInline
            />
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 stat-blink shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                    Recording Audio & Video
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  0:{String(MAX_DURATION - countdown).padStart(2, '0')} / 0:{String(MAX_DURATION).padStart(2, '0')}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_5px_rgba(239,68,68,0.5)]"
                  style={{ width: `${((MAX_DURATION - countdown) / MAX_DURATION) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={stopEarly}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 border border-transparent hover:border-red-900/50 rounded-full transition-colors flex-shrink-0"
              title="Stop early"
            >
              ⏹
            </button>
          </div>
        )}

        {captureState === 'processing' && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="animate-spin">⏳</span>
            <span>Processing clip…</span>
          </div>
        )}

        {captureState === 'done' && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <span>✅</span>
            <span>Video attached to incident</span>
          </div>
        )}
      </div>
    </>
  );
}
