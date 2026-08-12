import React, { useState } from 'react';
import { ListMusic } from 'lucide-react';
import { SITE_CONFIG } from '../config';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useMediaSession } from '../hooks/useMediaSession';
import VinylArt from './player/VinylArt';
import TrackInfo from './player/TrackInfo';
import Scrubber from './player/Scrubber';
import PlayerControls from './player/PlayerControls';
import VolumeControl from './player/VolumeControl';
import AudioEngineHidden from './player/AudioEngineHidden';
import PlaylistDrawer from './PlaylistDrawer';

export default function AudioPlayer() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    playlist,
    currentIndex,
    currentTrack,
    isPlaying,
    volume,
    isMuted,
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
  } = useAudioPlayer();

  // Lock-screen / notification controls (best-effort with YouTube embeds)
  useMediaSession({
    currentTrack,
    isPlaying,
    mode,
    ytPlayerRef,
    audioRef,
    onPrev: handlePrev,
    onNext: handleNext
  });

  // Feature toggles from config
  const showVolume = SITE_CONFIG.showVolumeControl !== false ? SITE_CONFIG.showVolumeControl : false;
  const showPlaylist = SITE_CONFIG.showPlaylistDrawer !== false ? SITE_CONFIG.showPlaylistDrawer : false;

  return (
    <>
      {/* Hidden Audio Engine Container */}
      <AudioEngineHidden
        ytContainerRef={ytContainerRef}
        audioRef={audioRef}
        silentAudioRef={silentAudioRef}
        mode={mode}
        currentTrack={currentTrack}
        onNext={handleNext}
        onPlayStateChange={setIsPlaying}
      />

      {/* Floating Audio Player Dock (Fixed Bottom) */}
      <section className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4" aria-label="Audio Player Dock">
        <div className="group relative flex items-center gap-3.5 sm:gap-4 rounded-full p-2.5 sm:p-3 pr-4 sm:pr-5 glass-panel drop-shadow-[0_8px_40px_rgba(0,0,0,0.55)]">
          
          {/* Spinning Vinyl Album Art */}
          <VinylArt
            coverUrl={currentTrack.coverUrl}
            title={currentTrack.title}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
          />

          {/* Track Info & Timeline Scrubber */}
          <div className="min-w-0 flex-1">
            <TrackInfo
              title={currentTrack.title}
              artist={currentTrack.artist}
            />

            <Scrubber
              isPlaying={isPlaying}
              mode={mode}
              currentIndex={currentIndex}
              ytPlayerRef={ytPlayerRef}
              audioRef={audioRef}
              onSeek={handleSeek}
            />
          </div>

          {/* Media Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <PlayerControls
              isPlaying={isPlaying}
              onTogglePlay={togglePlay}
              onNext={handleNext}
              onPrev={handlePrev}
            />

            {/* Volume Control - Hidden by default, toggle via config */}
            {showVolume && (
              <VolumeControl
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={handleVolumeChange}
                onToggleMute={toggleMute}
              />
            )}

            {/* Playlist Drawer Button - Hidden by default, toggle via config */}
            {showPlaylist && (
              <button
                id="btn-open-playlist"
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Open playlist drawer"
                className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white active:scale-95"
              >
                <ListMusic className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tracklist Modal Drawer - Rendered but only opens via button above */}
      <PlaylistDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        playlist={playlist}
        currentTrackIndex={currentIndex}
        isPlaying={isPlaying}
        onSelectTrack={playTrackAtIndex}
      />
    </>
  );
}
