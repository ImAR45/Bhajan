import { useState, useEffect } from 'react';

export function useLiveClock() {
  const [time, setTime] = useState(() => formatCurrentTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatCurrentTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

function formatCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const mm = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${mm} ${ampm}`;
}
