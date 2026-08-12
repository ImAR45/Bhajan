import React from 'react';
import { Music } from 'lucide-react';

export default function VinylArt({ coverUrl, title, isPlaying, onTogglePlay }) {
  return (
    <div 
      className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 cursor-pointer" 
      onClick={onTogglePlay}
      id="vinyl-art-container"
      role="button"
      tabIndex={0}
      aria-label={isPlaying ? "Pause playback" : "Start playback"}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTogglePlay(); }}
    >
      {/* Outer circular clip container — clips everything to a perfect circle */}
      <div className="h-full w-full rounded-full overflow-hidden shadow-lg ring-1 ring-white/30 bg-black">
        {/* Inner rotating disc */}
        <div
          className={`h-full w-full flex items-center justify-center animate-vinyl ${
            isPlaying ? '' : 'animate-vinyl-paused'
          }`}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title || "Album cover"}
              className="h-full w-full object-cover scale-[1.45] rounded-full"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-amber-600 to-amber-900 text-white">
              <Music className="w-7 h-7 opacity-80" />
            </div>
          )}
        </div>
      </div>
      
      {/* Vinyl Center Hole Notch */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 sm:h-3.5 sm:w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/80 ring-2 ring-white/40 shadow-inner" />
    </div>
  );
}
