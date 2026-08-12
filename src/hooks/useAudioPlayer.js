import { useState, useEffect, useRef, useCallback } from 'react';
import { SITE_CONFIG } from '../config';
import manualPlaylistData from '../data/manualPlaylist.json';
import { extractPlaylistId, formatTime, loadYouTubeIframeApi, fetchYouTubeTrackDetails, shuffleArray } from '../utils/youtubeHelper';

export function useAudioPlayer() {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isYtReady, setIsYtReady] = useState(false);

  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const audioRef = useRef(null);
  const silentAudioRef = useRef(null);

  const mode = SITE_CONFIG.mode || "youtube";

  const currentTrack = playlist[currentIndex] || {
    title: "Loading Track...",
    artist: SITE_CONFIG.subtitle || SITE_CONFIG.title,
    coverUrl: "",
    duration: "0:00"
  };

  // Play specific track by index
  const playTrackAtIndex = useCallback((index) => {
    if (!playlist[index]) return;
    setCurrentIndex(index);
    setCurrentTime(0);

    const targetTrack = playlist[index];

    if (mode === "youtube") {
      if (ytPlayerRef.current) {
        if (targetTrack.youtubeId && typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById(targetTrack.youtubeId);
          setIsPlaying(true);
        } else if (typeof ytPlayerRef.current.playVideoAt === 'function') {
          ytPlayerRef.current.playVideoAt(index);
          setIsPlaying(true);
        }
      }
    } else {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
      }, 100);
    }
  }, [mode, playlist]);

  // Next Track
  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    playTrackAtIndex(nextIndex);
  }, [playlist.length, currentIndex, playTrackAtIndex]);

  // Previous Track
  const handlePrev = useCallback(() => {
    if (playlist.length === 0) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrackAtIndex(prevIndex);
  }, [playlist.length, currentIndex, playTrackAtIndex]);

  // Initialize Engine
  useEffect(() => {
    if (mode === "youtube") {
      const playlistId = extractPlaylistId(SITE_CONFIG.youtubePlaylistUrl) || "PLOaruEZedzq_pfQoHBSR_-RE0wVkn_vEV";
      
      loadYouTubeIframeApi().then((YT) => {
        if (!ytContainerRef.current) return;

        new YT.Player(ytContainerRef.current, {
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
            modestbranding: 1
          },
          events: {
            onReady: async (event) => {
              ytPlayerRef.current = event.target;
              setIsYtReady(true);

              try {
                const rawPlaylist = event.target.getPlaylist() || [];
                if (rawPlaylist.length > 0) {
                  // Create and shuffle track list
                  const shuffledInitial = shuffleArray(rawPlaylist.map((id, idx) => ({
                    id,
                    title: `Track ${idx + 1}`,
                    artist: "",
                    coverUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
                    youtubeId: id
                  })));

                  setPlaylist(shuffledInitial);
                  setCurrentIndex(0);

                  // Cue YouTube player to first track in shuffled list so 1st song is always random!
                  const firstVideoId = shuffledInitial[0].youtubeId;
                  if (typeof event.target.cueVideoById === 'function') {
                    event.target.cueVideoById(firstVideoId);
                  }

                  if (typeof event.target.setVolume === 'function') {
                    event.target.setVolume(volume * 100);
                  }

                  // Fetch real track metadata asynchronously
                  const detailedTracks = await Promise.all(
                    shuffledInitial.map(async (item) => {
                      const details = await fetchYouTubeTrackDetails(item.youtubeId);
                      return {
                        ...item,
                        title: details.title || item.title,
                        artist: details.artist || "",
                        coverUrl: details.coverUrl || `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`
                      };
                    })
                  );

                  setPlaylist(detailedTracks);
                }
              } catch (err) {
                console.error("Error initializing YT playlist:", err);
              }
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                try {
                  const videoData = event.target.getVideoData();
                  const dur = event.target.getDuration();
                  const currentVideoId = videoData ? videoData.video_id : null;

                  if (currentVideoId) {
                    const realCoverUrl = `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`;
                    
                    setPlaylist((prevPlaylist) => {
                      const matchedIdx = prevPlaylist.findIndex(
                        (t) => t.youtubeId === currentVideoId || t.id === currentVideoId
                      );

                      if (matchedIdx !== -1) {
                        setCurrentIndex(matchedIdx);
                        const updated = [...prevPlaylist];
                        updated[matchedIdx] = {
                          ...updated[matchedIdx],
                          title: videoData.title || updated[matchedIdx].title,
                          artist: videoData.author || updated[matchedIdx].artist || "",
                          coverUrl: realCoverUrl,
                          duration: formatTime(dur)
                        };
                        return updated;
                      } else {
                        const newTrack = {
                          id: currentVideoId,
                          youtubeId: currentVideoId,
                          title: videoData.title || "Playing Track",
                          artist: videoData.author || "",
                          coverUrl: realCoverUrl,
                          duration: formatTime(dur)
                        };
                        const updated = [...prevPlaylist, newTrack];
                        setCurrentIndex(updated.length - 1);
                        return updated;
                      }
                    });
                  }
                  if (dur) setDuration(dur);
                } catch (e) {
                  console.error("Error syncing playing track state:", e);
                }
              } else if (event.data === YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              } else if (event.data === YT.PlayerState.ENDED) {
                setIsPlaying(false);
                handleNext();
              }
            }
          }
        });
      });
    } else {
      const shuffledManual = shuffleArray(manualPlaylistData);
      setPlaylist(shuffledManual);
      setCurrentIndex(0);
    }
  }, [mode, handleNext, volume]);

  // Time update ticker
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        if (mode === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const curr = ytPlayerRef.current.getCurrentTime() || 0;
          const dur = typeof ytPlayerRef.current.getDuration === 'function' ? (ytPlayerRef.current.getDuration() || 0) : 0;
          setCurrentTime(curr);
          if (dur) setDuration(dur);
        } else if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime || 0);
          setDuration(audioRef.current.duration || 0);
        }
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isPlaying, mode]);

  // Toggle Play/Pause
  const togglePlay = useCallback(() => {
    if (mode === "youtube") {
      if (ytPlayerRef.current) {
        if (isPlaying) {
          if (typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          }
        } else {
          // If first play, ensure we load/play the current shuffled track
          const currentTrackItem = playlist[currentIndex];
          if (currentTrackItem && currentTrackItem.youtubeId && typeof ytPlayerRef.current.loadVideoById === 'function') {
            ytPlayerRef.current.loadVideoById(currentTrackItem.youtubeId);
            setIsPlaying(true);
          } else if (typeof ytPlayerRef.current.playVideo === 'function') {
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
  }, [mode, isPlaying, playlist, currentIndex]);

  // Handle Timeline Seek
  const handleSeek = useCallback((newTime) => {
    setCurrentTime(newTime);
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
    currentTime,
    duration,
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
