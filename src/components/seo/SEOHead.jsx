import React, { useEffect } from 'react';
import { SITE_CONFIG } from '../../config';

export default function SEOHead({ currentTrack }) {
  const siteTitle = `${SITE_CONFIG.title} — ${SITE_CONFIG.subtitle}`;
  const siteDescription = `${SITE_CONFIG.title} — Listen to divine bhajans, sacred chants, and Indian devotional music in an ultra-sleek glassmorphic audio player. Free 24/7 continuous music streaming.`;

  const activeTrackTitle = currentTrack?.title 
    ? `${currentTrack.title} | ${SITE_CONFIG.title}` 
    : siteTitle;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const originUrl = window.location.origin;

    // 1. Update Document Title
    document.title = activeTrackTitle;

    // Helper to set or create meta tags
    const setMetaTag = (selector, attributeName, value) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        if (selector.includes('name=')) {
          const name = selector.match(/name="([^"]+)"/)?.[1];
          if (name) element.setAttribute('name', name);
        } else if (selector.includes('property=')) {
          const property = selector.match(/property="([^"]+)"/)?.[1];
          if (property) element.setAttribute('property', property);
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attributeName, value);
    };

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', currentUrl);

    // 2. Primary Meta Tags
    setMetaTag('meta[name="description"]', 'content', siteDescription);
    setMetaTag('meta[name="keywords"]', 'content', 'Bhajan, Devotional Music, Indian Spiritual Songs, Krishna Bhajans, Shiv Stotram, Daily Bhajans, Deluxe Audio Player, Free Audio Player');
    setMetaTag('meta[name="author"]', 'content', SITE_CONFIG.title);
    setMetaTag('meta[name="robots"]', 'content', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMetaTag('meta[name="googlebot"]', 'content', 'index, follow');

    // 3. OpenGraph Meta Tags
    setMetaTag('meta[property="og:site_name"]', 'content', SITE_CONFIG.title);
    setMetaTag('meta[property="og:title"]', 'content', activeTrackTitle);
    setMetaTag('meta[property="og:description"]', 'content', siteDescription);
    setMetaTag('meta[property="og:type"]', 'content', 'music.playlist');
    setMetaTag('meta[property="og:url"]', 'content', currentUrl);
    setMetaTag('meta[property="og:image"]', 'content', currentTrack?.coverUrl || `${originUrl}/background.png`);
    setMetaTag('meta[property="og:image:alt"]', 'content', siteTitle);
    setMetaTag('meta[property="og:locale"]', 'content', 'en_US');

    // 4. Twitter Cards Metadata
    setMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'content', activeTrackTitle);
    setMetaTag('meta[name="twitter:description"]', 'content', siteDescription);
    setMetaTag('meta[name="twitter:image"]', 'content', currentTrack?.coverUrl || `${originUrl}/background.png`);

    // 5. Rich Multi-Schema JSON-LD Graph (Dynamic relative URLs)
    let scriptTag = document.getElementById('json-ld-schema');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'json-ld-schema';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const schemaGraph = {
      "@context": "https://schema.org",
      "@graph": [
        // WebSite Schema
        {
          "@type": "WebSite",
          "@id": `${originUrl}/#website`,
          "url": originUrl,
          "name": SITE_CONFIG.title,
          "description": siteDescription,
          "inLanguage": ["en", "hi"]
        },

        // WebApplication Schema
        {
          "@type": "WebApplication",
          "@id": `${originUrl}/#webapp`,
          "url": originUrl,
          "name": SITE_CONFIG.title,
          "applicationCategory": "MultimediaApplication",
          "operatingSystem": "All",
          "browserRequirements": "Requires JavaScript and HTML5 Audio support",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        },

        // MusicPlaylist Schema
        {
          "@type": "MusicPlaylist",
          "@id": `${originUrl}/#playlist`,
          "name": `${SITE_CONFIG.title} — ${SITE_CONFIG.subtitle}`,
          "description": "Continuous stream of divine Indian bhajans and sacred chants.",
          "numTracks": 10,
          "genre": "Devotional / Spiritual",
          "track": currentTrack?.title ? {
            "@type": "MusicRecording",
            "name": currentTrack.title,
            "byArtist": {
              "@type": "MusicGroup",
              "name": currentTrack.artist || SITE_CONFIG.title
            }
          } : undefined
        },

        // FAQPage Schema
        {
          "@type": "FAQPage",
          "@id": `${originUrl}/#faq`,
          "mainEntity": [
            {
              "@type": "Question",
              "name": `What is ${SITE_CONFIG.title}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `${SITE_CONFIG.title} is an online web application streaming continuous Indian devotional bhajans, sacred chants, and spiritual melodies in a deluxe audio player.`
              }
            },
            {
              "@type": "Question",
              "name": `Is ${SITE_CONFIG.title} free to listen to?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Yes, ${SITE_CONFIG.title} is 100% free to listen to 24/7 on desktop and mobile web browsers without registration or subscription.`
              }
            },
            {
              "@type": "Question",
              "name": `Does ${SITE_CONFIG.title} play on mobile lock screen?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Yes, ${SITE_CONFIG.title} supports background audio playback and native lock screen controls on both iOS Safari and Android Chrome.`
              }
            }
          ]
        }
      ]
    };

    scriptTag.textContent = JSON.stringify(schemaGraph);
  }, [activeTrackTitle, currentTrack, siteDescription]);

  return null;
}
