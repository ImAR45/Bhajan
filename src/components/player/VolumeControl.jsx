import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function VolumeControl({ volume, isMuted, onVolumeChange, onToggleMute }) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const containerRef = useRef(null);

  const handleSliderChange = (e) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    setShowVolumeSlider((prev) => !prev);
  };

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowVolumeSlider(false);
      }
    };
    if (showVolumeSlider) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showVolumeSlider]);

  return (
    <div className="relative" id="volume-control-container" ref={containerRef}>
      <button
        id="btn-volume-toggle"
        type="button"
        onClick={handleButtonClick}
        aria-label="Volume controls"
        className={`grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full transition active:scale-95 ${
          showVolumeSlider 
            ? 'bg-white/20 text-white ring-1 ring-white/30' 
            : 'text-white/80 hover:bg-white/15 hover:text-white'
        }`}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-red-400" />
        ) : (
          <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        )}
      </button>

      {/* Volume Slider Popup on Click */}
      {showVolumeSlider && (
        <div
          className="absolute bottom-12 right-0 p-3 glass-panel rounded-xl flex items-center gap-2 shadow-2xl border border-white/25 animate-in fade-in slide-in-from-bottom-2 duration-150 z-50"
        >
          <button
            type="button"
            onClick={onToggleMute}
            className="text-white/70 hover:text-white transition p-1 rounded-full hover:bg-white/10"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            id="volume-slider-input"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleSliderChange}
            className="w-24 accent-white cursor-pointer"
            aria-label="Volume level"
          />
        </div>
      )}
    </div>
  );
}
