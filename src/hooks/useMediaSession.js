import { useEffect, useRef } from 'react';
import { SITE_CONFIG } from '../config';

export function useMediaSession({ currentTrack, isPlaying, mode, ytPlayerRef, audioRef, silentAudioRef, onPrev, onNext }) {
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  const modeRef = useRef(mode);

  useEffect(() => {
    onPrevRef.current = onPrev;
  }, [onPrev]);

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Silent audio only for manual HTML5 mode — it steals the mobile gesture from YouTube
  useEffect(() => {
    if (mode !== 'manual') return;
    if (isPlaying && silentAudioRef.current?.paused) {
      silentAudioRef.current.play().catch(() => {});
    }
  }, [isPlaying, silentAudioRef, mode]);

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
              src: currentTrack.coverUrl || '/background.jpg',
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

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers = {
      play: () => {
        if (modeRef.current === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
          ytPlayerRef.current.playVideo();
        } else if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      },
      pause: () => {
        if (modeRef.current === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
          ytPlayerRef.current.pauseVideo();
        } else if (audioRef.current) {
          audioRef.current.pause();
        }
      },
      previoustrack: () => onPrevRef.current?.(),
      nexttrack: () => onNextRef.current?.()
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
  }, [ytPlayerRef, audioRef]);
}
