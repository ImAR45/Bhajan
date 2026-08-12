import { useEffect } from 'react';
import { SITE_CONFIG } from '../config';

export function useMediaSession({ currentTrack, isPlaying, mode, ytPlayerRef, audioRef, silentAudioRef, onPrev, onNext }) {
  useEffect(() => {
    if ('mediaSession' in navigator) {
      if (currentTrack && currentTrack.title) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title,
            artist: currentTrack.artist || SITE_CONFIG.subtitle || SITE_CONFIG.title,
            album: SITE_CONFIG.title,
            artwork: [
              {
                src: currentTrack.coverUrl || '/background.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          });
        } catch (e) {
          console.error("MediaSession metadata error:", e);
        }
      }

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (mode === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
            ytPlayerRef.current.playVideo();
          } else if (audioRef.current) {
            audioRef.current.play();
          }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (mode === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          } else if (audioRef.current) {
            audioRef.current.pause();
          }
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => onPrev());
        navigator.mediaSession.setActionHandler('nexttrack', () => onNext());
      } catch (e) {
        console.error("MediaSession action handlers error:", e);
      }
    }
  }, [currentTrack, isPlaying, mode, ytPlayerRef, audioRef, onPrev, onNext]);
}
