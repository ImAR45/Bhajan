import React from 'react';
import { formatTime } from '../../utils/youtubeHelper';

export default function Scrubber({ currentTime, duration, onSeek }) {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleChange = (e) => {
    onSeek(parseFloat(e.target.value));
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
}
