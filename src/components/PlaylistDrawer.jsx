import React from 'react';
import { X, Play, Pause, ListMusic, Music } from 'lucide-react';
import { SITE_CONFIG } from '../config';

export default function PlaylistDrawer({ isOpen, onClose, playlist, currentTrackIndex, isPlaying, onSelectTrack }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md transition-opacity">
      {/* Backdrop overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Card */}
      <div className="relative z-10 w-full max-w-lg max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl glass-panel border border-white/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-300">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <ListMusic className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white tracking-wide">Playlist ({playlist.length} Tracks)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition active:scale-95"
            aria-label="Close playlist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playlist Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-white/5">
          {playlist.length === 0 ? (
            <div className="py-12 text-center text-white/60 text-sm">
              Loading playlist tracks...
            </div>
          ) : (
            playlist.map((track, idx) => {
              const isCurrent = idx === currentTrackIndex;
              return (
                <button
                  key={track.id || idx}
                  onClick={() => {
                    onSelectTrack(idx);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3.5 p-2.5 rounded-xl transition text-left group ${
                    isCurrent
                      ? 'bg-white/15 text-white ring-1 ring-white/30 shadow-md'
                      : 'hover:bg-white/10 text-white/80 hover:text-white'
                  }`}
                >
                  {/* Track Thumbnail / Cover */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black/40 border border-white/10 shadow-sm">
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-amber-500/20 text-amber-300">
                        <Music className="w-5 h-5" />
                      </div>
                    )}

                    {/* Active Track Overlay */}
                    {isCurrent && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center text-amber-400">
                        {isPlaying ? (
                          <div className="flex items-end gap-0.5 h-4">
                            <span className="w-1 bg-amber-400 animate-pulse h-3"></span>
                            <span className="w-1 bg-amber-400 animate-pulse h-4 delay-75"></span>
                            <span className="w-1 bg-amber-400 animate-pulse h-2 delay-150"></span>
                          </div>
                        ) : (
                          <Play className="w-4 h-4 fill-amber-400" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Track Details */}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${isCurrent ? 'text-white font-semibold' : 'text-white/90'}`}>
                      {track.title || `Track ${idx + 1}`}
                    </p>
                    <p className="truncate text-xs text-white/60 mt-0.5">
                      {track.artist || SITE_CONFIG.subtitle || SITE_CONFIG.title}
                    </p>
                  </div>

                  {/* Track Duration */}
                  <div className="text-xs tabular-nums text-white/50 group-hover:text-white/80 transition">
                    {track.duration || '--:--'}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
