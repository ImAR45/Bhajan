import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SITE_CONFIG } from '../config';
import manualPlaylistData from '../data/manualPlaylist.json';
import { extractPlaylistId, loadYouTubeIframeApi, fetchYouTubeTrackDetails, shuffleArray } from '../utils/youtubeHelper';

const METADATA_BATCH_SIZE = 6;
const TRANSITION_GUARD_MS = 3500;

async function enrichTracksInBatches(tracks, onBatch) {
  for (let i = 0; i < tracks.length; i += METADATA_BATCH_SIZE) {
    const slice = tracks.slice(i, i + METADATA_BATCH_SIZE);
    const enriched = await Promise.all(
      slice.map(async (item) => {
        const details = await fetchYouTubeTrackDetails(item.youtubeId);
        return {
          ...item,
          title: details.title || item.title,
          artist: details.artist || "",
          coverUrl: details.coverUrl || item.coverUrl
        };
      })
    );

    onBatch(i, enriched);

    // Yield so the UI stays responsive between network bursts
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

export function useAudioPlayer() {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isYtReady, setIsYtReady] = useState(false);

  // Guards against split-second buffering PAUSED events on mobile track skips
  const isTransitioningRef = useRef(false);
  const transitionTimerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const audioRef = useRef(null);
  const silentAudioRef = useRef(null);
  const volumeRef = useRef(volume);

  // Keep latest values available inside YT callbacks (avoids stale closures)
  const playlistRef = useRef(playlist);
  const currentIndexRef = useRef(currentIndex);
  const playTrackAtIndexRef = useRef(null);

  const mode = SITE_CONFIG.mode || "youtube";

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const currentTrack = useMemo(() => {
    return playlist[currentIndex] || {
      title: "Loading Track...",
      artist: SITE_CONFIG.subtitle || SITE_CONFIG.title,
      coverUrl: "",
      duration: "0:00"
    };
  }, [playlist, currentIndex]);

  const beginTransition = useCallback(() => {
    isTransitioningRef.current = true;
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      transitionTimerRef.current = null;
    }, TRANSITION_GUARD_MS);
  }, []);

  // Activate silent audio anchor (keeps mobile background session active)
  const activateSilentAudio = useCallback(() => {
    if (silentAudioRef.current && silentAudioRef.current.paused) {
      silentAudioRef.current.play().catch(() => { });
    }
  }, []);

  // Play specific track by index (Instant & Deterministic)
  const playTrackAtIndex = useCallback((index) => {
    const list = playlistRef.current;
    if (!list[index]) return;

    setCurrentIndex(index);

    const targetTrack = list[index];
    activateSilentAudio();

    if (mode === "youtube") {
      if (ytPlayerRef.current) {
        beginTransition();
        setIsPlaying(true);

        if (targetTrack.youtubeId && typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById(targetTrack.youtubeId);
        }
        // Explicit play is required on many mobile browsers after loadVideoById
        if (typeof ytPlayerRef.current.playVideo === 'function') {
          ytPlayerRef.current.playVideo();
        }
      }
    } else {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
      }, 100);
    }
  }, [mode, activateSilentAudio, beginTransition]);

  useEffect(() => {
    playTrackAtIndexRef.current = playTrackAtIndex;
  }, [playTrackAtIndex]);

  // Next Track
  const handleNext = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;
    const nextIndex = (currentIndexRef.current + 1) % list.length;
    playTrackAtIndex(nextIndex);
  }, [playTrackAtIndex]);

  // Previous Track
  const handlePrev = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;
    const prevIndex = (currentIndexRef.current - 1 + list.length) % list.length;
    playTrackAtIndex(prevIndex);
  }, [playTrackAtIndex]);

  // Initialize Engine (Clean & Lightweight)
  useEffect(() => {
    let destroyed = false;
    let player = null;

    if (mode === "youtube") {
      const playlistId = extractPlaylistId(SITE_CONFIG.youtubePlaylistUrl) || "PLOaruEZedzq_pfQoHBSR_-RE0wVkn_vEV";

      loadYouTubeIframeApi().then((YT) => {
        if (destroyed || !ytContainerRef.current) return;

        player = new YT.Player(ytContainerRef.current, {
          height: '0',
          width: '0',
          playerVars: {
            listType: 'playlist',
            list: playlistId,
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1
          },
          events: {
            onReady: async (event) => {
              if (destroyed) return;
              ytPlayerRef.current = event.target;
              setIsYtReady(true);

              try {
                const rawPlaylist = event.target.getPlaylist() || [];
                if (rawPlaylist.length > 0) {
                  // Create and shuffle playlist so first track is ALWAYS random
                  const initialTracks = rawPlaylist.map((id, idx) => ({
                    id,
                    title: `Track ${idx + 1}`,
                    artist: "",
                    coverUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
                    youtubeId: id
                  }));

                  const shuffledInitial = shuffleArray(initialTracks);
                  setPlaylist(shuffledInitial);
                  setCurrentIndex(0);
                  playlistRef.current = shuffledInitial;
                  currentIndexRef.current = 0;

                  // Cue the first randomized track (no autoplay until user gesture)
                  if (typeof event.target.cueVideoById === 'function') {
                    event.target.cueVideoById(shuffledInitial[0].youtubeId);
                  }

                  if (typeof event.target.setVolume === 'function') {
                    event.target.setVolume(volumeRef.current * 100);
                  }

                  // Fetch metadata in small batches to avoid network/UI jank
                  await enrichTracksInBatches(shuffledInitial, (startIndex, enriched) => {
                    if (destroyed) return;
                    setPlaylist((prev) => {
                      const next = [...prev];
                      for (let i = 0; i < enriched.length; i++) {
                        const idx = startIndex + i;
                        if (next[idx] && next[idx].youtubeId === enriched[i].youtubeId) {
                          next[idx] = { ...next[idx], ...enriched[i] };
                        }
                      }
                      playlistRef.current = next;
                      return next;
                    });
                  });
                }
              } catch (err) {
                console.error("Error initializing YT playlist:", err);
              }
            },
            onStateChange: (event) => {
              if (destroyed) return;
              const state = event.data;

              if (state === YT.PlayerState.PLAYING) {
                isTransitioningRef.current = false;
                if (transitionTimerRef.current) {
                  clearTimeout(transitionTimerRef.current);
                  transitionTimerRef.current = null;
                }
                setIsPlaying(true);
                activateSilentAudio();
              } else if (state === YT.PlayerState.PAUSED) {
                // Ignore brief PAUSED blips during loadVideoById / buffering on mobile
                if (!isTransitioningRef.current) {
                  setIsPlaying(false);
                }
              } else if (state === YT.PlayerState.ENDED) {
                // Advance inside the YT event tick (refs + event.target) for mobile autoplay
                const list = playlistRef.current;
                if (list.length === 0) return;
                const nextIndex = (currentIndexRef.current + 1) % list.length;
                const nextTrack = list[nextIndex];
                if (!nextTrack) return;

                currentIndexRef.current = nextIndex;
                setCurrentIndex(nextIndex);
                isTransitioningRef.current = true;
                if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
                transitionTimerRef.current = setTimeout(() => {
                  isTransitioningRef.current = false;
                  transitionTimerRef.current = null;
                }, TRANSITION_GUARD_MS);

                setIsPlaying(true);
                activateSilentAudio();

                if (nextTrack.youtubeId && typeof event.target.loadVideoById === 'function') {
                  event.target.loadVideoById(nextTrack.youtubeId);
                }
                if (typeof event.target.playVideo === 'function') {
                  event.target.playVideo();
                }
              }
            }
          }
        });
      });
    } else {
      const shuffledManual = shuffleArray(manualPlaylistData);
      setPlaylist(shuffledManual);
      setCurrentIndex(0);
      playlistRef.current = shuffledManual;
      currentIndexRef.current = 0;
    }

    return () => {
      destroyed = true;
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      try {
        if (player && typeof player.destroy === 'function') {
          player.destroy();
        }
      } catch (e) {
        // ignore destroy races
      }
      ytPlayerRef.current = null;
    };
  }, [mode, activateSilentAudio]);

  // Toggle Play/Pause
  const togglePlay = useCallback(() => {
    activateSilentAudio();

    if (mode === "youtube") {
      if (ytPlayerRef.current) {
        if (isPlaying) {
          if (typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          }
        } else {
          if (typeof ytPlayerRef.current.playVideo === 'function') {
            ytPlayerRef.current.playVideo();
          }
        }
      } else {
        console.warn("YouTube player is not fully ready.");
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }
  }, [mode, isPlaying, activateSilentAudio]);

  // Handle Timeline Seek
  const handleSeek = useCallback((newTime) => {
    if (mode === "youtube") {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(newTime, true);
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  }, [mode]);

  // Handle Volume Change
  const handleVolumeChange = useCallback((newVol) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (mode === "youtube") {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(newVol * 100);
      }
    } else if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  }, [mode]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      if (mode === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.unMute === 'function') {
        ytPlayerRef.current.unMute();
      }
      if (audioRef.current) audioRef.current.volume = volume;
    } else {
      setIsMuted(true);
      if (mode === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.mute === 'function') {
        ytPlayerRef.current.mute();
      }
      if (audioRef.current) audioRef.current.volume = 0;
    }
  }, [isMuted, mode, volume]);

  return {
    playlist,
    currentIndex,
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    isYtReady,
    mode,
    ytPlayerRef,
    ytContainerRef,
    audioRef,
    silentAudioRef,
    togglePlay,
    handleNext,
    handlePrev,
    playTrackAtIndex,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    setIsPlaying
  };
}
