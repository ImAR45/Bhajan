import React, { memo } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

const PlayerControls = memo(function PlayerControls({ isPlaying, onTogglePlay, onNext, onPrev }) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" id="player-controls-container">
      {/* Prev Track */}
      <button
        id="btn-prev-track"
        type="button"
        onClick={onPrev}
        aria-label="Previous track"
        className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white active:scale-95"
      >
        <SkipBack className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
      </button>

      {/* Play/Pause Main Button */}
      <button
        id="btn-toggle-play"
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Pause track" : "Play track"}
        className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full bg-white text-black shadow-lg transition hover:scale-105 active:scale-95"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current ml-0" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Next Track */}
      <button
        id="btn-next-track"
        type="button"
        onClick={onNext}
        aria-label="Next track"
        className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white active:scale-95"
      >
        <SkipForward className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
      </button>
    </div>
  );
});

export default PlayerControls;
