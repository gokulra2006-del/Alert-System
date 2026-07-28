import React, { useEffect, useRef } from 'react';

interface Props {
  active: boolean;
  color?: string;
}

/**
 * ConfirmationPulse — renders a green expanding ring around the parent element.
 * The ring fires 2 times over ~2 seconds then fades.
 * Mount this when `active` becomes true; unmount or set active=false to stop.
 */
export default function ConfirmationPulse({ active, color = '#22C55E' }: Props) {
  const ring1 = useRef<HTMLDivElement>(null);
  const ring2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    [ring1, ring2].forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      el.style.animation = 'none';
      void el.offsetHeight; // reflow
      el.style.animation = `confirm-ring 1s ease-out ${i * 0.4}s 2 forwards`;
    });
  }, [active]);

  if (!active) return null;

  return (
    <>
      <style>{`
        @keyframes confirm-ring {
          0%   { transform: scale(1);   opacity: 0.85; }
          70%  { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
      `}</style>
      <div
        ref={ring1}
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          border: `3px solid ${color}`,
          opacity: 0,
        }}
      />
      <div
        ref={ring2}
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          border: `3px solid ${color}`,
          opacity: 0,
        }}
      />
    </>
  );
}
