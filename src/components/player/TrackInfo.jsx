import React from 'react';
import { SITE_CONFIG } from '../../config';

export default function TrackInfo({ title, artist }) {
  // Display artist name: use fetched artist, fallback to config subtitle
  const displayArtist = artist || SITE_CONFIG.subtitle || SITE_CONFIG.title;

  return (
    <div className="min-w-0 flex-1" id="track-info-container">
      <h3 className="truncate text-sm sm:text-[15px] font-semibold text-white drop-shadow-sm">
        {title || "Loading Track..."}
      </h3>
      {displayArtist && (
        <p className="truncate text-xs sm:text-[13px] text-white/75 font-medium mt-0.5">
          {displayArtist}
        </p>
      )}
    </div>
  );
}
