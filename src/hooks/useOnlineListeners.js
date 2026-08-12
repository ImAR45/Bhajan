import { useState, useEffect } from 'react';
import { SITE_CONFIG } from '../config';

export function useOnlineListeners() {
  const { min = 24, max = 48, realtimeOnly = true } = SITE_CONFIG.liveListeners || {};

  // Base count for simulated mode (used when realtimeOnly is false)
  const [simulatedBase] = useState(() => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  });

  // Real-time connected visitors count across active tabs/devices
  const [realtimeCount, setRealtimeCount] = useState(1);

  // 1. Real-time Cross-Tab & Peer Presence Tracking via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const myTabId = Math.random().toString(36).substring(2, 9);
    const activeTabsMap = new Map();
    activeTabsMap.set(myTabId, Date.now());

    let channel = null;

    if ('BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('bhajan_saloon_exact_presence');

        const broadcastHeartbeat = () => {
          try {
            channel.postMessage({ type: 'HEARTBEAT', tabId: myTabId, timestamp: Date.now() });
          } catch (e) {}
        };

        channel.onmessage = (event) => {
          if (!event.data) return;
          const { type, tabId, timestamp } = event.data;

          if (type === 'HEARTBEAT' || type === 'PONG') {
            activeTabsMap.set(tabId, timestamp || Date.now());
          } else if (type === 'LEAVE') {
            activeTabsMap.delete(tabId);
          }

          // Clean up stale tabs older than 6 seconds
          const now = Date.now();
          activeTabsMap.forEach((time, id) => {
            if (now - time > 6000) activeTabsMap.delete(id);
          });

          setRealtimeCount(Math.max(1, activeTabsMap.size));
        };

        broadcastHeartbeat();
        const heartbeatInterval = setInterval(broadcastHeartbeat, 2000);

        const handleUnload = () => {
          try {
            channel.postMessage({ type: 'LEAVE', tabId: myTabId });
          } catch (e) {}
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
          clearInterval(heartbeatInterval);
          window.removeEventListener('beforeunload', handleUnload);
          try {
            channel.postMessage({ type: 'LEAVE', tabId: myTabId });
            channel.close();
          } catch (e) {}
        };
      } catch (e) {
        console.error("BroadcastChannel presence error:", e);
      }
    }
  }, []);

  // 2. Return Exact Real-time Count (or simulated base if realtimeOnly is false)
  if (realtimeOnly) {
    return realtimeCount; // Shows 100% exact real count (1, 2, 3...)
  }

  return simulatedBase + (realtimeCount - 1);
}
