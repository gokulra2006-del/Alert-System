import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../store';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { storage } from '../../firebase'; // Assuming storage is initialized

interface Props {
  incidentId: string;
  durationMs?: number;
  onComplete?: (url: string) => void;
}

export default function AudioCapture({ incidentId, durationMs = 20000, onComplete }: Props) {
  const { updateIncident } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let timeoutId: number;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            await updateIncident(incidentId, { audioUrl: base64data });
            if (onComplete) onComplete(base64data);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
          };
          reader.readAsDataURL(blob);
        };

        recorder.start();
        setIsRecording(true);

        // Auto-stop after duration
        timeoutId = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, durationMs);

      } catch (err: any) {
        setError('Microphone access denied or unavailable.');
        console.error('Audio capture error:', err);
      }
    };

    startRecording();

    return () => {
      clearTimeout(timeoutId);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [incidentId, durationMs, updateIncident, onComplete]);

  if (error) {
    return <div className="text-[10px] text-red-500">{error}</div>;
  }

  if (!isRecording) return null;

  return (
    <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/50 rounded-full px-3 py-1.5 shadow-sm absolute top-4 right-4 z-50">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-[10px] font-bold text-red-400 tracking-wider">RECORDING AUDIO</span>
    </div>
  );
}
