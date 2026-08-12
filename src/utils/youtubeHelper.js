/**
 * Utility: Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Helper to parse YouTube Playlist IDs and load the YouTube IFrame API dynamically
 */

export function extractPlaylistId(urlOrId) {
  if (!urlOrId) return null;
  
  // If it's already just an ID (e.g., PL3-sRM8xAzYyK3n_mP-ZzV6u-Uv1Z9Zl0)
  if (/^[a-zA-Z0-9_-]{10,40}$/.test(urlOrId.trim())) {
    return urlOrId.trim();
  }

  try {
    const parsedUrl = new URL(urlOrId);
    const listParam = parsedUrl.searchParams.get("list");
    if (listParam) return listParam;
  } catch (e) {
    // If not a valid URL structure, try regex extraction
    const match = urlOrId.match(/[?&]list=([^#&?]+)/);
    if (match && match[1]) return match[1];
  }

  return null;
}

export function formatTime(seconds) {
  if (isNaN(seconds) || seconds === null || seconds === undefined) return "0:00";
  const secs = Math.floor(seconds);
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
}

export function loadYouTubeIframeApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.getElementById("yt-iframe-api");
    if (!existingScript) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Set up global callback
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      resolve(window.YT);
    };
  });
}

/**
 * Fetch real video title and artist/channel name from YouTube oEmbed APIs.
 * The oEmbed `author_name` field returns the YouTube channel name which is
 * the closest to "artist/singer" we can get without an API key.
 */
export async function fetchYouTubeTrackDetails(videoId) {
  // Try noembed.com first (no CORS issues)
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          title: data.title,
          artist: data.author_name || "",
          coverUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        };
      }
    }
  } catch (e) {
    // Ignore and fallback
  }

  // Fallback to YouTube's own oEmbed
  try {
    const res2 = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.title) {
        return {
          title: data2.title,
          artist: data2.author_name || "",
          coverUrl: data2.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        };
      }
    }
  } catch (e) {
    // Ignore and fallback
  }

  return {
    title: `Track ${videoId}`,
    artist: "",
    coverUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  };
}
