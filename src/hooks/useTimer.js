import { useEffect, useRef, useState, useCallback } from 'react';

// Стабильный интервал (не сбрасывается при re-render)
export function useInterval(callback, delay) {
  const ref = useRef(callback);
  useEffect(() => { ref.current = callback; }, [callback]);
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => ref.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Обратный отсчёт + вызов onFire() когда достигает 0
export function useLiveCountdown(totalSeconds, enabled, onFire) {
  const [seconds, setSeconds] = useState(totalSeconds);

  // Сброс при изменении интервала или отключении
  useEffect(() => { setSeconds(totalSeconds); }, [totalSeconds, enabled]);

  useInterval(() => {
    if (!enabled) return;
    setSeconds(prev => {
      if (prev <= 1) {
        onFire();
        return totalSeconds;
      }
      return prev - 1;
    });
  }, enabled ? 1000 : null);

  return seconds;
}
