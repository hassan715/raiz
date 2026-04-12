import { useEffect, useRef } from 'react';

export function useIdleTimeout(timeoutMinutes: number, onIdle: () => void) {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // If set to 0 (Never), we don't run the timer
    if (timeoutMinutes <= 0) return;

    const handleActivity = () => {
      // Clear the existing timer
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

      // Start a new timer
      timeoutRef.current = window.setTimeout(onIdle, timeoutMinutes * 60 * 1000);
    };

    // Events that count as "activity"
    const events = ['mousemove', 'keydown', 'click', 'scroll'];

    // Attach listeners
    events.forEach((event) => window.addEventListener(event, handleActivity));

    // Start the initial countdown
    handleActivity();

    // Cleanup when the component unmounts
    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [timeoutMinutes, onIdle]);
}
