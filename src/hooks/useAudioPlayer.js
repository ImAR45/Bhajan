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

  const isTransitioningRef = useRef(false);
  const transitionTimerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const audioRef = useRef(null);
  const silentAudioRef = useRef(null);
  const volumeRef = useRef(volume);

  const playlistRef = useRef(playlist);
  const currentIndexRef = useRef(currentIndex);

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

  const activateSilentAudio = useCallback(() => {
    if (silentAudioRef.current && silentAudioRef.current.paused) {
      silentAudioRef.current.play().catch(() => { });
    }
  }, []);

  const ensureYtPlaying = useCallback((player = ytPlayerRef.current) => {
    if (player && typeof player.playVideo === 'function') {
      player.playVideo();
    }
  }, []);

  /**
   * Source of truth for UI title/cover: whatever YouTube is actually playing.
   * Never trust optimistic next/prev index math against a shuffled local list.
   */
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

        // Already in sync — avoid extra renders
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
      // ignore sync races during teardown
    }
  }, []);

  // Play specific track by youtube id (keeps playlist session when possible)
  const playTrackAtIndex = useCallback((index) => {
    const list = playlistRef.current;
    if (!list[index]) return;

    const targetTrack = list[index];
    currentIndexRef.current = index;
    setCurrentIndex(index);
    activateSilentAudio();

    if (mode === "youtube") {
      if (ytPlayerRef.current) {
        beginTransition();
        setIsPlaying(true);

        // Prefer playVideoAt so nextVideo order stays intact
        if (typeof ytPlayerRef.current.playVideoAt === 'function') {
          ytPlayerRef.current.playVideoAt(index);
        } else if (targetTrack.youtubeId && typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById(targetTrack.youtubeId);
        }
        ensureYtPlaying();
      }
    } else {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
      }, 100);
    }
  }, [mode, activateSilentAudio, beginTransition, ensureYtPlaying]);

  // Next — native nextVideo for mobile autoplay; UI index syncs from video_id on PLAYING
  const handleNext = useCallback(() => {
    if (playlistRef.current.length === 0) return;
    activateSilentAudio();

    if (mode === "youtube" && ytPlayerRef.current) {
      beginTransition();
      setIsPlaying(true);

      if (typeof ytPlayerRef.current.nextVideo === 'function') {
        ytPlayerRef.current.nextVideo();
      }
      ensureYtPlaying();
      return;
    }

    const nextIndex = (currentIndexRef.current + 1) % playlistRef.current.length;
    playTrackAtIndex(nextIndex);
  }, [mode, activateSilentAudio, beginTransition, ensureYtPlaying, playTrackAtIndex]);

  const handlePrev = useCallback(() => {
    if (playlistRef.current.length === 0) return;
    activateSilentAudio();

    if (mode === "youtube" && ytPlayerRef.current) {
      beginTransition();
      setIsPlaying(true);

      if (typeof ytPlayerRef.current.previousVideo === 'function') {
        ytPlayerRef.current.previousVideo();
      }
      ensureYtPlaying();
      return;
    }

    const prevIndex =
      (currentIndexRef.current - 1 + playlistRef.current.length) % playlistRef.current.length;
    playTrackAtIndex(prevIndex);
  }, [mode, activateSilentAudio, beginTransition, ensureYtPlaying, playTrackAtIndex]);

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
                // Native shuffle so nextVideo order matches what actually plays
                if (typeof event.target.setShuffle === 'function') {
                  event.target.setShuffle(true);
                }
                if (typeof event.target.setLoop === 'function') {
                  event.target.setLoop(true);
                }

                const rawPlaylist = event.target.getPlaylist() || [];
                if (rawPlaylist.length > 0) {
                  // Keep React list in the SAME id order as the YT playlist
                  const initialTracks = rawPlaylist.map((id, idx) => ({
                    id,
                    title: `Track ${idx + 1}`,
                    artist: "",
                    coverUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
                    youtubeId: id
                  }));

                  // Random start index (shuffle alone often still begins at 0)
                  const startIndex = Math.floor(Math.random() * initialTracks.length);

                  setPlaylist(initialTracks);
                  setCurrentIndex(startIndex);
                  playlistRef.current = initialTracks;
                  currentIndexRef.current = startIndex;

                  if (typeof event.target.cuePlaylist === 'function') {
                    event.target.cuePlaylist({
                      listType: 'playlist',
                      list: playlistId,
                      index: startIndex
                    });
                  } else if (typeof event.target.cueVideoById === 'function') {
                    event.target.cueVideoById(initialTracks[startIndex].youtubeId);
                  }

                  // Re-apply shuffle after cuePlaylist (cue can reset it)
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
              const YTStates = window.YT?.PlayerState || {};

              if (state === YTStates.PLAYING) {
                isTransitioningRef.current = false;
                if (transitionTimerRef.current) {
                  clearTimeout(transitionTimerRef.current);
                  transitionTimerRef.current = null;
                }
                setIsPlaying(true);
                activateSilentAudio();
                syncUiToPlayingVideo(event.target);
              } else if (state === YTStates.BUFFERING) {
                if (isTransitioningRef.current) {
                  setIsPlaying(true);
                }
                // Sync early so title updates as soon as the next video is known
                syncUiToPlayingVideo(event.target);
              } else if (state === YTStates.CUED || state === YTStates.UNSTARTED) {
                if (isTransitioningRef.current && typeof event.target.playVideo === 'function') {
                  setIsPlaying(true);
                  event.target.playVideo();
                }
                syncUiToPlayingVideo(event.target);
              } else if (state === YTStates.PAUSED) {
                if (isTransitioningRef.current) {
                  setIsPlaying(true);
                  if (typeof event.target.playVideo === 'function') {
                    event.target.playVideo();
                  }
                } else {
                  setIsPlaying(false);
                }
              } else if (state === YTStates.ENDED) {
                beginTransition();
                setIsPlaying(true);
                activateSilentAudio();

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
      try {
        if (player && typeof player.destroy === 'function') {
          player.destroy();
        }
      } catch (e) {
        // ignore destroy races
      }
      ytPlayerRef.current = null;
    };
  }, [mode, activateSilentAudio, beginTransition, syncUiToPlayingVideo]);

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
