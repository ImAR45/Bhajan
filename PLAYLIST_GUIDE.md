# 🎵 Playlist & Audio Configuration Guide (Behind The Scenes)

This guide explains how you (the site owner) can manage the playlist, update YouTube links, or add manual audio tracks behind the scenes in your codebase.

---

## ⚙️ Main Configuration File: `src/config.js`

Open `src/config.js` in your editor to change audio modes or YouTube playlists:

```javascript
export const SITE_CONFIG = {
  title: "BHANJAN SALOON",
  subtitle: "Divine Melodies & Sacred Sounds",
  backgroundImage: "/background.png",

  // Choose Mode: "youtube" OR "manual"
  mode: "youtube", 

  // Paste your YouTube or YouTube Music playlist link here!
  youtubePlaylistUrl: "https://music.youtube.com/playlist?list=YOUR_PLAYLIST_ID_HERE",
};
```

---

## 📺 Method 1: YouTube / YouTube Music Playlist (Recommended)

1. Create or open any playlist on **YouTube** or **YouTube Music**.
2. Copy the playlist URL from your browser address bar. Examples:
   - `https://music.youtube.com/playlist?list=PL3-sRM8xAzYyK3n_mP-ZzV6u-Uv1Z9Zl0`
   - `https://www.youtube.com/playlist?list=PL3-sRM8xAzYyK3n_mP-ZzV6u-Uv1Z9Zl0`
3. Paste the URL into `youtubePlaylistUrl` inside `src/config.js`.
4. Set `mode: "youtube"`.

> **Note**: Whenever you add, remove, or reorder tracks in your YouTube playlist, your website automatically reflects the updates!

---

## 🎼 Method 2: Manual Tracks & Local/Hosted MP3 Files

If you want to use custom `.mp3` files or self-hosted audio:

1. Open `src/config.js` and set `mode: "manual"`.
2. Open `src/data/manualPlaylist.json`.
3. Add your tracks using this JSON structure:

```json
[
  {
    "id": "track-1",
    "title": "Song Title",
    "artist": "Artist Name",
    "audioUrl": "https://your-domain.com/path-to-song.mp3",
    "coverUrl": "https://your-domain.com/path-to-cover-image.jpg",
    "duration": "3:45"
  }
]
```

---

## 🖼️ Changing the Background Image

To change the background image:
1. Replace `/public/background.png` with your new image.
2. Ensure the filename in `src/config.js` matches `backgroundImage: "/background.png"`.
