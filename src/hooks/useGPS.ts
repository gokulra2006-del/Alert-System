import { useCallback } from 'react';

export const VIT_CENTER = { lat: 12.8422, lng: 80.155 };
const GPS_TIMEOUT = 1000;

export function useGPS() {
  const getLocation = useCallback(
    (): Promise<{ lat: number; lng: number }> =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(VIT_CENTER);
          return;
        }
        const timer = setTimeout(() => resolve(VIT_CENTER), GPS_TIMEOUT);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {
            clearTimeout(timer);
            resolve(VIT_CENTER);
          },
          { timeout: GPS_TIMEOUT, maximumAge: 30000 }
        );
      }),
    []
  );

  return { getLocation };
}
