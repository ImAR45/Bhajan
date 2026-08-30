/**
 * Deluxe Audio Player - Behind-The-Scenes Configuration
 * 
 * DAILY SCHEDULE: Define unique settings for each day of the week.
 * The app automatically picks the correct config based on today's day.
 * 
 * You can customize: title, subtitle, backgroundImage, mode, playlist URL, etc.
 * Any property NOT set in a daily override will fallback to DEFAULT_CONFIG.
 */

// Default / Fallback Config (used when a daily config doesn't override a field)
const DEFAULT_CONFIG = {
  title: "BHANJAN",
  subtitle: "Divine Melodies & Sacred Sounds",
  backgroundImage: "/background.png",

  // "youtube" or "manual"
  mode: "youtube",
  youtubePlaylistUrl: "https://www.youtube.com/playlist?list=PLQsSpm2cRLsA",

  spotifyUrl: "https://open.spotify.com",
  ytMusicUrl: "https://music.youtube.com",

  // Live Listeners Configuration
  // `realtimeOnly: false` shows the saloon live indicator (fluctuating organically 24-48 + real tabs)
  // `realtimeOnly: true` shows only local browser tab count
  liveListeners: {
    realtimeOnly: true,
    min: 24,
    max: 48
  },

  // Feature toggles (set to true to show, false to hide)
  showVolumeControl: false,
  showPlaylistDrawer: false,
};

/**
 * DAILY SCHEDULE CONFIG
 * 
 * Override any DEFAULT_CONFIG property per day.
 * Days: "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
 * 
 * Example: To use a different playlist and background on Sundays:
 * 
 *   sunday: {
 *     title: "Sunday Special",
 *     subtitle: "Morning Bhajans",
 *     backgroundImage: "/sunday-bg.png",
 *     youtubePlaylistUrl: "https://music.youtube.com/playlist?list=SUNDAY_PLAYLIST_ID",
 *   },
 */
const DAILY_SCHEDULE = {
  sunday: {
    // Override any fields for Sunday here
  },
  monday: {
    // Override any fields for Monday here
  },
  tuesday: {
    // Override any fields for Tuesday here
  },
  wednesday: {
    // Override any fields for Wednesday here
  },
  thursday: {
    // Override any fields for Thursday here
  },
  friday: {
    // Override any fields for Friday here
  },
  saturday: {
    // Override any fields for Saturday here
  },
};

// --- Resolve today's config automatically ---
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const todayKey = DAYS[new Date().getDay()];
const todayOverride = DAILY_SCHEDULE[todayKey] || {};

export const SITE_CONFIG = {
  ...DEFAULT_CONFIG,
  ...todayOverride,
  // Merge nested liveListeners if partially overridden
  liveListeners: {
    ...DEFAULT_CONFIG.liveListeners,
    ...(todayOverride.liveListeners || {}),
  },
};
