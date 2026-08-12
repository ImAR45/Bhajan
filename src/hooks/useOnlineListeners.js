import { useState, useEffect } from 'react';
import { SITE_CONFIG } from '../config';

export function useOnlineListeners() {
  const { min = 24, max = 48, realtimeOnly = false } = SITE_CONFIG.liveListeners || {};

  // Organic base count generated on mount
  const [baseCount, setBaseCount] = useState(() => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  });

  const [activeTabs, setActiveTabs] = useState(1);

  // 1. Cross-Tab presence via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel('bhajan_saloon_presence');
    const myTabId = Math.random().toString(36).substring(2, 9);
    const knownTabs = new Set([myTabId]);

    const broadcastPresence = () => {
      try {
        channel.postMessage({ type: 'PING', tabId: myTabId });
      } catch (e) {}
    };

    channel.onmessage = (event) => {
      if (!event.data) return;
      if (event.data.type === 'PING') {
        if (!knownTabs.has(event.data.tabId)) {
          knownTabs.add(event.data.tabId);
          setActiveTabs(knownTabs.size);
          channel.postMessage({ type: 'PONG', tabId: myTabId });
        }
      } else if (event.data.type === 'PONG') {
        if (!knownTabs.has(event.data.tabId)) {
          knownTabs.add(event.data.tabId);
          setActiveTabs(knownTabs.size);
        }
      } else if (event.data.type === 'LEAVE') {
        knownTabs.delete(event.data.tabId);
        setActiveTabs(Math.max(1, knownTabs.size));
      }
    };

    broadcastPresence();
    const pingInterval = setInterval(broadcastPresence, 3000);

    const handleBeforeUnload = () => {
      try {
        channel.postMessage({ type: 'LEAVE', tabId: myTabId });
      } catch (e) {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(pingInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      try {
        channel.postMessage({ type: 'LEAVE', tabId: myTabId });
        channel.close();
      } catch (e) {}
    };
  }, []);

  // 2. Real-time organic listener count ticker (ticks every 3-5s)
  useEffect(() => {
    const interval = setInterval(() => {
      setBaseCount((prev) => {
        const roll = Math.random();
        let delta;
        if (roll < 0.25) delta = -1;
        else if (roll < 0.5) delta = 0;
        else if (roll < 0.8) delta = 1;
        else delta = Math.random() > 0.5 ? 2 : -2;

        const next = prev + delta;
        return Math.max(min, Math.min(max, next));
      });
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [min, max]);

  if (realtimeOnly) {
    return activeTabs;
  }

  return baseCount + (activeTabs - 1);
}
