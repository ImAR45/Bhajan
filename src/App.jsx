import React from 'react';
import Header from './components/Header';
import AudioPlayer from './components/AudioPlayer';
import SEOHead from './components/seo/SEOHead';
import { SITE_CONFIG } from './config';

export default function App() {
  return (
    <>
      {/* SEO Head Manager */}
      <SEOHead />

      <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-between overflow-hidden selection:bg-amber-500/30">
        {/* Fullscreen Hero Background Image with Overlay */}
        <div 
          id="hero-background-image"
          className="fixed inset-0 -z-10 bg-black bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{ backgroundImage: `url("${SITE_CONFIG.backgroundImage}")` }}
        >
          {/* Dark Vignette Gradient Overlays */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
          <div className="pointer-events-none absolute inset-0 bg-radial-vignette opacity-50" />
        </div>

        {/* Top Navigation Bar */}
        <Header />

        {/* Hero Title Section */}
        <article className="mt-[14vh] flex flex-col items-center px-6 text-center select-none z-10">
          <h1 
            id="main-site-heading" 
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-widest text-white uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]"
          >
            {SITE_CONFIG.title}
          </h1>
          <p 
            id="main-site-subheading" 
            className="mt-3 text-sm sm:text-base md:text-lg font-medium text-white/80 tracking-wider drop-shadow-md"
          >
            {SITE_CONFIG.subtitle}
          </p>
        </article>

        {/* Bottom Floating Audio Player Dock */}
        <footer className="mb-[8vh] w-full flex justify-center px-6">
          <AudioPlayer />
        </footer>
      </main>
    </>
  );
}
