import React, { useEffect, useState, memo } from 'react';
import { formatTime } from '../../utils/youtubeHelper';

/**
 * Owns its own time polling so the rest of the player dock
 * does not re-render every tick.
 */
const Scrubber = memo(function Scrubber({ isPlaying, mode, currentIndex, ytPlayerRef, audioRef, onSeek }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [currentIndex]);

  useEffect(() => {
    let timer;

    const tick = () => {
      if (mode === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const curr = ytPlayerRef.current.getCurrentTime() || 0;
        const dur = typeof ytPlayerRef.current.getDuration === 'function'
          ? (ytPlayerRef.current.getDuration() || 0)
          : 0;
        setCurrentTime(curr);
        if (dur) setDuration(dur);
      } else if (audioRef?.current) {
        setCurrentTime(audioRef.current.currentTime || 0);
        setDuration(audioRef.current.duration || 0);
      }
    };

    // Refresh immediately on play/track changes, then poll lightly
    tick();

    if (isPlaying) {
      timer = setInterval(tick, 500);
    }

    return () => clearInterval(timer);
  }, [isPlaying, mode, currentIndex, ytPlayerRef, audioRef]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleChange = (e) => {
    const next = parseFloat(e.target.value);
    setCurrentTime(next);
    onSeek(next);
  };

  return (
    <div className="mt-1.5 sm:mt-2" id="scrubber-container">
      <div className="group/bar relative h-2 w-full flex items-center cursor-pointer">
        {/* Track background line */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/90 transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Range Input for Drag / Seeking */}
        <input
          id="audio-seek-slider"
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Seek timeline"
        />

        {/* Hover Scrubber Circle Thumb */}
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/bar:opacity-100"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Time Indicators */}
      <div className="mt-1 text-left text-[11px] tabular-nums text-white/60 font-medium">
        <span>{formatTime(currentTime)}</span>
        <span className="mx-1 opacity-40">/</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
});

export default Scrubber;
