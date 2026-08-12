import React from 'react';

export default function AudioEngineHidden({ ytContainerRef, audioRef, silentAudioRef, mode, currentTrack, onNext, onPlayStateChange }) {
  return (
    <div className="hidden pointer-events-none" id="audio-engine-hidden-slot">
      {/* YouTube IFrame API Slot */}
      <div ref={ytContainerRef} id="yt-player-slot" />

      {/* Mobile Lockscreen Audio Session Anchor */}
      <audio
        ref={silentAudioRef}
        loop
        playsInline
        src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
      />

      {/* HTML5 Audio Player for Manual Mode */}
      {mode === "manual" && currentTrack && currentTrack.audioUrl && (
        <audio
          ref={audioRef}
          src={currentTrack.audioUrl}
          onEnded={onNext}
          onPlay={() => onPlayStateChange(true)}
          onPause={() => onPlayStateChange(false)}
        />
      )}
    </div>
  );
}
