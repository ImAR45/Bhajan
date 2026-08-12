import { useEffect, useRef } from 'react';
import { SITE_CONFIG } from '../config';

export function useMediaSession({ currentTrack, isPlaying, mode, ytPlayerRef, audioRef, silentAudioRef, onPrev, onNext }) {
  // Ref to track if silent audio was started (mobile lock screen anchor)
  const silentAudioStartedRef = useRef(false);

  // Keep silent audio alive whenever YouTube is playing (critical for mobile lock screen)
  useEffect(() => {
    if (isPlaying && silentAudioRef.current) {
      if (silentAudioRef.current.paused) {
        silentAudioRef.current.play().catch(() => {});
      }
      silentAudioStartedRef.current = true;
    }
  }, [isPlaying, silentAudioRef]);

  // Update MediaSession metadata when track changes
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentTrack && currentTrack.title && currentTrack.title !== "Loading Track...") {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist || SITE_CONFIG.subtitle || SITE_CONFIG.title,
          album: SITE_CONFIG.title,
          artwork: [
            {
              src: currentTrack.coverUrl || '/background.png',
              sizes: '512x512',
              type: 'image/jpeg'
            }
          ]
        });
      } catch (e) {
        // Ignore metadata errors silently
      }
    }
  }, [currentTrack]);

  // Update playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Set up action handlers (once on mount)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers = {
      play: () => {
        if (mode === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
          ytPlayerRef.current.playVideo();
        } else if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      },
      pause: () => {
        if (mode === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
          ytPlayerRef.current.pauseVideo();
        } else if (audioRef.current) {
          audioRef.current.pause();
        }
      },
      previoustrack: () => onPrev(),
      nexttrack: () => onNext()
    };

    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {
        // Handler not supported
      }
    }

    return () => {
      for (const action of Object.keys(handlers)) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (e) {}
      }
    };
  }, [mode, ytPlayerRef, audioRef, onPrev, onNext]);
}
