import { useState, useEffect, useRef, useCallback } from 'react';
import { SITE_CONFIG } from '../config';

export function useOnlineListeners() {
  const { min = 24, max = 48, realtimeOnly = false } = SITE_CONFIG.liveListeners || {};

  // Organic base count (fluctuates between min-max like a busy live room)
  const [baseCount, setBaseCount] = useState(() => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  });

  // Real active tabs detected via BroadcastChannel
  const [activeTabs, setActiveTabs] = useState(1);
  const knownTabsRef = useRef(new Map()); // tabId -> lastSeen timestamp

  // 1. Cross-Tab presence via BroadcastChannel with heartbeat
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    let channel;
    try {
      channel = new BroadcastChannel('bhajan_saloon_presence_v2');
    } catch (e) {
      return;
    }

    const myTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    knownTabsRef.current.set(myTabId, Date.now());

    const updateTabCount = () => {
      // Purge tabs not seen in 8 seconds
      const now = Date.now();
      const staleThreshold = 8000;
      for (const [id, lastSeen] of knownTabsRef.current.entries()) {
        if (id !== myTabId && now - lastSeen > staleThreshold) {
          knownTabsRef.current.delete(id);
        }
      }
      setActiveTabs(Math.max(1, knownTabsRef.current.size));
    };

    const broadcastHeartbeat = () => {
      try {
        channel.postMessage({ type: 'HEARTBEAT', tabId: myTabId, ts: Date.now() });
      } catch (e) {}
      updateTabCount();
    };

    channel.onmessage = (event) => {
      if (!event.data || !event.data.tabId) return;
      const { type, tabId, ts } = event.data;

      if (type === 'HEARTBEAT') {
        knownTabsRef.current.set(tabId, ts || Date.now());
        // Respond so the sender knows we exist
        try {
          channel.postMessage({ type: 'ACK', tabId: myTabId, ts: Date.now() });
        } catch (e) {}
      } else if (type === 'ACK') {
        knownTabsRef.current.set(tabId, ts || Date.now());
      } else if (type === 'LEAVE') {
        knownTabsRef.current.delete(tabId);
      }

      updateTabCount();
    };

    // Send initial heartbeat immediately and then every 2.5 seconds
    broadcastHeartbeat();
    const heartbeatInterval = setInterval(broadcastHeartbeat, 2500);

    const handleBeforeUnload = () => {
      try {
        channel.postMessage({ type: 'LEAVE', tabId: myTabId, ts: Date.now() });
      } catch (e) {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Also handle visibility change (mobile tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        broadcastHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      try {
        channel.postMessage({ type: 'LEAVE', tabId: myTabId, ts: Date.now() });
        channel.close();
      } catch (e) {}
    };
  }, []);

  // 2. Organic fluctuating listener ticker
  useEffect(() => {
    if (realtimeOnly) return; // Skip ticker when showing exact count only

    const tick = () => {
      setBaseCount((prev) => {
        const roll = Math.random();
        let delta;
        if (roll < 0.2) delta = -1;
        else if (roll < 0.45) delta = 0;
        else if (roll < 0.75) delta = 1;
        else delta = Math.random() > 0.5 ? 2 : -2;

        return Math.max(min, Math.min(max, prev + delta));
      });
    };

    const interval = setInterval(tick, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [min, max, realtimeOnly]);

  // 3. Return combined count
  if (realtimeOnly) {
    return activeTabs;
  }

  return baseCount + (activeTabs - 1);
}
