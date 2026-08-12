import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SITE_CONFIG } from '../config';
import manualPlaylistData from '../data/manualPlaylist.json';
import { extractPlaylistId, loadYouTubeIframeApi, fetchYouTubeTrackDetails, shuffleArray } from '../utils/youtubeHelper';

const METADATA_BATCH_SIZE = 6;
const TRANSITION_GUARD_MS = 4000;

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
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function getYtStates() {
  return window.YT?.PlayerState || {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
  };
}

export function useAudioPlayer() {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isYtReady, setIsYtReady] = useState(false);

  const isTransitioningRef = useRef(false);
  const transitionTimerRef = useRef(null);
  const playRetryTimerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const audioRef = useRef(null);
  const silentAudioRef = useRef(null);
  const volumeRef = useRef(volume);
  const playlistRef = useRef(playlist);
  const currentIndexRef = useRef(currentIndex);
  const isPlayingRef = useRef(isPlaying);
  // User wants playback to continue across lock/background when the OS allows it
  const shouldResumeRef = useRef(false);

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

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const currentTrack = useMemo(() => {
    return playlist[currentIndex] || {
      title: "Loading Track...",
      artist: SITE_CONFIG.subtitle || SITE_CONFIG.title,
      coverUrl: "",
      duration: "0:00"
    };
  }, [playlist, currentIndex]);

  const clearPlayRetry = useCallback(() => {
    if (playRetryTimerRef.current) {
      clearTimeout(playRetryTimerRef.current);
      playRetryTimerRef.current = null;
    }
  }, []);

  const beginTransition = useCallback(() => {
    isTransitioningRef.current = true;
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      transitionTimerRef.current = null;
      clearPlayRetry();

      // If we never reached PLAYING, unstick the UI play button
      const player = ytPlayerRef.current;
      const states = getYtStates();
      const state = player && typeof player.getPlayerState === 'function'
        ? player.getPlayerState()
        : null;
      if (state !== states.PLAYING && state !== states.BUFFERING) {
        setIsPlaying(false);
      }
    }, TRANSITION_GUARD_MS);
  }, [clearPlayRetry]);

  /** Kick play inside the current turn; one delayed retry for mobile load races */
  const forcePlay = useCallback((player = ytPlayerRef.current) => {
    if (!player || typeof player.playVideo !== 'function') return;
    try {
      player.playVideo();
    } catch (e) {
      // ignore
    }
    clearPlayRetry();
    playRetryTimerRef.current = setTimeout(() => {
      playRetryTimerRef.current = null;
      if (!isTransitioningRef.current) return;
      try {
        if (typeof player.playVideo === 'function') player.playVideo();
      } catch (e) {
        // ignore
      }
    }, 250);
  }, [clearPlayRetry]);

  const syncUiToPlayingVideo = useCallback((player) => {
    if (!player || typeof player.getVideoData !== 'function') return;

    try {
      const videoData = player.getVideoData();
      const videoId = videoData?.video_id;
      if (!videoId) return;

      const coverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const liveTitle = videoData.title || "";
      const liveArtist = videoData.author || "";

      setPlaylist((prev) => {
        const matchedIdx = prev.findIndex(
          (t) => t.youtubeId === videoId || t.id === videoId
        );

        if (matchedIdx === -1) {
          const newTrack = {
            id: videoId,
            youtubeId: videoId,
            title: liveTitle || "Playing Track",
            artist: liveArtist,
            coverUrl
          };
          const next = [...prev, newTrack];
          playlistRef.current = next;
          currentIndexRef.current = next.length - 1;
          setCurrentIndex(next.length - 1);
          return next;
        }

        if (currentIndexRef.current !== matchedIdx) {
          currentIndexRef.current = matchedIdx;
          setCurrentIndex(matchedIdx);
        }

        const existing = prev[matchedIdx];
        const nextTitle = liveTitle || existing.title;
        const nextArtist = existing.artist || liveArtist;
        const nextCover = coverUrl || existing.coverUrl;

        if (
          existing.title === nextTitle &&
          existing.artist === nextArtist &&
          existing.coverUrl === nextCover
        ) {
          return prev;
        }

        const next = [...prev];
        next[matchedIdx] = {
          ...existing,
          title: nextTitle,
          artist: nextArtist,
          coverUrl: nextCover
        };
        playlistRef.current = next;
        return next;
      });
    } catch (e) {
      // ignore sync races
    }
  }, []);

  const skipYtByOffset = useCallback((offset) => {
    const player = ytPlayerRef.current;
    if (!player) return;

    beginTransition();
    // Optimistic UI; cleared if PLAYING never arrives
    setIsPlaying(true);

    const list = playlistRef.current;
    let currentId = null;
    try {
      currentId = typeof player.getVideoData === 'function'
        ? player.getVideoData()?.video_id
        : null;
    } catch (e) {
      currentId = null;
    }

    let fromIndex = currentId
      ? list.findIndex((t) => t.youtubeId === currentId || t.id === currentId)
      : currentIndexRef.current;
    if (fromIndex < 0) fromIndex = currentIndexRef.current;

    const targetIndex = list.length
      ? (fromIndex + offset + list.length) % list.length
      : -1;
    const targetId = targetIndex >= 0 ? list[targetIndex]?.youtubeId : null;

    // Load the exact next/prev id in this tap turn (keeps iOS user-gesture for playVideo)
    if (targetId && typeof player.loadVideoById === 'function') {
      currentIndexRef.current = targetIndex;
      setCurrentIndex(targetIndex);
      player.loadVideoById(targetId);
      forcePlay(player);
      return;
    }

    if (offset > 0 && typeof player.nextVideo === 'function') {
      player.nextVideo();
    } else if (offset < 0 && typeof player.previousVideo === 'function') {
      player.previousVideo();
    }
    forcePlay(player);
  }, [beginTransition, forcePlay]);

  const playTrackAtIndex = useCallback((index) => {
    const list = playlistRef.current;
    if (!list[index]) return;

    const targetTrack = list[index];
    currentIndexRef.current = index;
    setCurrentIndex(index);

    if (mode === "youtube") {
      const player = ytPlayerRef.current;
      if (!player) return;
      beginTransition();
      setIsPlaying(true);

      if (targetTrack.youtubeId && typeof player.loadVideoById === 'function') {
        player.loadVideoById(targetTrack.youtubeId);
      } else if (typeof player.playVideoAt === 'function') {
        player.playVideoAt(index);
      }
      forcePlay(player);
    } else {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
      }, 100);
    }
  }, [mode, beginTransition, forcePlay]);

  const handleNext = useCallback(() => {
    if (playlistRef.current.length === 0) return;
    if (mode === "youtube") {
      skipYtByOffset(1);
      return;
    }
    playTrackAtIndex((currentIndexRef.current + 1) % playlistRef.current.length);
  }, [mode, skipYtByOffset, playTrackAtIndex]);

  const handlePrev = useCallback(() => {
    if (playlistRef.current.length === 0) return;
    if (mode === "youtube") {
      skipYtByOffset(-1);
      return;
    }
    const len = playlistRef.current.length;
    playTrackAtIndex((currentIndexRef.current - 1 + len) % len);
  }, [mode, skipYtByOffset, playTrackAtIndex]);

  useEffect(() => {
    let destroyed = false;
    let player = null;

    if (mode === "youtube") {
      const playlistId = extractPlaylistId(SITE_CONFIG.youtubePlaylistUrl) || "PLOaruEZedzq_pfQoHBSR_-RE0wVkn_vEV";

      loadYouTubeIframeApi().then((YT) => {
        if (destroyed || !ytContainerRef.current) return;

        player = new YT.Player(ytContainerRef.current, {
          height: '135',
          width: '240',
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
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: async (event) => {
              if (destroyed) return;
              ytPlayerRef.current = event.target;
              setIsYtReady(true);

              try {
                if (typeof event.target.setShuffle === 'function') {
                  event.target.setShuffle(true);
                }
                if (typeof event.target.setLoop === 'function') {
                  event.target.setLoop(true);
                }

                const rawPlaylist = event.target.getPlaylist() || [];
                if (rawPlaylist.length > 0) {
                  const initialTracks = rawPlaylist.map((id, idx) => ({
                    id,
                    title: `Track ${idx + 1}`,
                    artist: "",
                    coverUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
                    youtubeId: id
                  }));

                  const startIndex = Math.floor(Math.random() * initialTracks.length);

                  setPlaylist(initialTracks);
                  setCurrentIndex(startIndex);
                  playlistRef.current = initialTracks;
                  currentIndexRef.current = startIndex;

                  // Cue starting track without tearing down playlist session
                  if (typeof event.target.cueVideoById === 'function') {
                    event.target.cueVideoById(initialTracks[startIndex].youtubeId);
                  }

                  if (typeof event.target.setShuffle === 'function') {
                    event.target.setShuffle(true);
                  }
                  if (typeof event.target.setLoop === 'function') {
                    event.target.setLoop(true);
                  }

                  if (typeof event.target.setVolume === 'function') {
                    event.target.setVolume(volumeRef.current * 100);
                  }

                  await enrichTracksInBatches(initialTracks, (start, enriched) => {
                    if (destroyed) return;
                    setPlaylist((prev) => {
                      const next = [...prev];
                      for (let i = 0; i < enriched.length; i++) {
                        const idx = start + i;
                        if (next[idx] && next[idx].youtubeId === enriched[i].youtubeId) {
                          next[idx] = {
                            ...next[idx],
                            title: enriched[i].title || next[idx].title,
                            artist: enriched[i].artist || next[idx].artist,
                            coverUrl: enriched[i].coverUrl || next[idx].coverUrl
                          };
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
              const YTStates = getYtStates();

              if (state === YTStates.PLAYING) {
                isTransitioningRef.current = false;
                if (transitionTimerRef.current) {
                  clearTimeout(transitionTimerRef.current);
                  transitionTimerRef.current = null;
                }
                clearPlayRetry();
                shouldResumeRef.current = true;
                setIsPlaying(true);
                syncUiToPlayingVideo(event.target);
              } else if (state === YTStates.BUFFERING) {
                syncUiToPlayingVideo(event.target);
              } else if (state === YTStates.CUED) {
                syncUiToPlayingVideo(event.target);
                // Only one kick from the event callback — not a gesture, but helps desktop
                if (isTransitioningRef.current && typeof event.target.playVideo === 'function') {
                  event.target.playVideo();
                }
              } else if (state === YTStates.PAUSED) {
                if (isTransitioningRef.current) {
                  // Ignore brief pause blips while skipping; don't spam playVideo here
                  // (those calls are outside the user gesture and fail on mobile)
                } else {
                  setIsPlaying(false);
                }
              } else if (state === YTStates.ENDED) {
                beginTransition();
                shouldResumeRef.current = true;
                setIsPlaying(true);
                if (typeof event.target.nextVideo === 'function') {
                  event.target.nextVideo();
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
      clearPlayRetry();
      try {
        if (player && typeof player.destroy === 'function') {
          player.destroy();
        }
      } catch (e) {
        // ignore
      }
      ytPlayerRef.current = null;
    };
  }, [mode, beginTransition, syncUiToPlayingVideo, clearPlayRetry]);

  const togglePlay = useCallback(() => {
    if (mode === "youtube") {
      const player = ytPlayerRef.current;
      if (!player) {
        console.warn("YouTube player is not fully ready.");
        return;
      }

      const states = getYtStates();
      const state = typeof player.getPlayerState === 'function' ? player.getPlayerState() : null;
      const actuallyPlaying = state === states.PLAYING || state === states.BUFFERING;

      // Use real player state — React isPlaying can be stuck true after a failed skip
      if (actuallyPlaying) {
        shouldResumeRef.current = false;
        if (typeof player.pauseVideo === 'function') player.pauseVideo();
        setIsPlaying(false);
      } else {
        isTransitioningRef.current = false;
        shouldResumeRef.current = true;
        if (typeof player.playVideo === 'function') player.playVideo();
        setIsPlaying(true);
      }
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        shouldResumeRef.current = false;
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        shouldResumeRef.current = true;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }
  }, [mode, isPlaying]);

  // Best-effort: when user unlocks / returns to the tab, resume if they hadn't paused
  useEffect(() => {
    const tryResume = () => {
      if (document.visibilityState !== 'visible') return;
      if (!shouldResumeRef.current) return;

      if (mode === 'youtube' && ytPlayerRef.current) {
        const states = getYtStates();
        const state = typeof ytPlayerRef.current.getPlayerState === 'function'
          ? ytPlayerRef.current.getPlayerState()
          : null;
        if (state !== states.PLAYING && state !== states.BUFFERING) {
          try {
            ytPlayerRef.current.playVideo();
          } catch (e) {
            // ignore
          }
        }
      } else if (mode === 'manual' && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', tryResume);
    window.addEventListener('pageshow', tryResume);
    window.addEventListener('focus', tryResume);

    return () => {
      document.removeEventListener('visibilitychange', tryResume);
      window.removeEventListener('pageshow', tryResume);
      window.removeEventListener('focus', tryResume);
    };
  }, [mode]);

  const handleSeek = useCallback((newTime) => {
    if (mode === "youtube") {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(newTime, true);
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  }, [mode]);

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
