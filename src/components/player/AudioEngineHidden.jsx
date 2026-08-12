import React from 'react';

/**
 * YouTube iframes with display:none often play the first video on mobile,
 * then refuse subsequent playVideo()/nextVideo() calls. Keep the player
 * in the layout (off-screen) instead of using Tailwind `hidden`.
 */
export default function AudioEngineHidden({ ytContainerRef, audioRef, silentAudioRef, mode, currentTrack, onNext, onPlayStateChange }) {
  return (
    <div id="audio-engine-hidden-slot" aria-hidden="true">
      {/* Off-screen but "visible" to the browser's media pipeline */}
      <div
        ref={ytContainerRef}
        id="yt-player-slot"
        className="yt-player-offscreen pointer-events-none"
      />

      {/* Manual-mode HTML5 audio only — silent YT anchor fights mobile playback */}
      {mode === "manual" && (
        <>
          <audio
            ref={silentAudioRef}
            loop
            playsInline
            preload="auto"
            src="data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
          />
          {currentTrack?.audioUrl && (
            <audio
              ref={audioRef}
              src={currentTrack.audioUrl}
              onEnded={onNext}
              onPlay={() => onPlayStateChange(true)}
              onPause={() => onPlayStateChange(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
