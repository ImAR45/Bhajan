import { useEffect, useRef } from 'react';
import { SITE_CONFIG } from '../config';

/**
 * Lock-screen / notification media controls.
 * Note: with YouTube embeds, OS/YouTube often still pause audio when the screen
 * locks (background play is a YouTube Premium feature). This API still helps
 * when the session is allowed, and after the user unlocks.
 */
export function useMediaSession({ currentTrack, isPlaying, mode, ytPlayerRef, audioRef, onPrev, onNext }) {
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
            },
            {
              src: currentTrack.coverUrl || '/background.jpg',
              sizes: '256x256',
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

    const playYtOrAudio = () => {
      if (modeRef.current === "youtube" && ytPlayerRef.current?.playVideo) {
        ytPlayerRef.current.playVideo();
      } else if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    };

    const pauseYtOrAudio = () => {
      if (modeRef.current === "youtube" && ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
    };

    const handlers = {
      play: playYtOrAudio,
      pause: pauseYtOrAudio,
      stop: pauseYtOrAudio,
      previoustrack: () => onPrevRef.current?.(),
      nexttrack: () => onNextRef.current?.()
    };

    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {
        // Handler not supported on this browser
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
