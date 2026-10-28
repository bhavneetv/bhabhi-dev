import React, { useEffect } from 'react';
import type { Card } from '../types/game';
import { CardView } from './CardView';
import { soundSynth } from '../audio/soundSynth';

interface ThullaOverlayProps {
  cutterName: string;
  pickerName: string;
  cutCard: Card;
  highestLeadCard?: Card;
  pickedCount?: number;
  onDismiss: () => void;
}

export const ThullaOverlay: React.FC<ThullaOverlayProps> = ({
  cutterName,
  pickerName,
  cutCard,
  highestLeadCard,
  onDismiss,
}) => {
  useEffect(() => {
    // Trigger haptics without dual audio boom (boom is triggered upon card impact)
    soundSynth.triggerHaptic([60, 40, 80]);

    const timer = setTimeout(() => {
      onDismiss();
    }, 1800);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer overflow-hidden"
    >
      {/* Red/Orange Fiery Vignette Flash */}
      <div className="absolute inset-0 bg-red-950/80 backdrop-blur-md animate-thulla-flash pointer-events-none" />

      {/* Comic Radial Burst Rays */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-conic-gradient(from 0deg, #f97316 0deg 15deg, transparent 15deg 30deg)',
          animation: 'spin 20s linear infinite',
        }}
      />

      {/* Main Dramatic Container with Screen Shake */}
      <div className="relative z-10 flex flex-col items-center max-w-sm sm:max-w-lg w-full text-center animate-thulla-shake px-2">
        {/* Giant Comic 3D Slamming "THULLA!" Title */}
        <div className="animate-stamp-slam select-none">
          <h1
            className="text-4xl sm:text-7xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-red-600 filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]"
            style={{
              WebkitTextStroke: '2px #7f1d1d',
              fontFamily: 'Space Grotesk, Cinzel, sans-serif',
            }}
          >
            💥 THULLA!
          </h1>
          <div className="text-xs sm:text-xl font-black text-amber-200 tracking-widest uppercase -mt-1 sm:-mt-2 filter drop-shadow">
            THE CUT IS MADE!
          </div>
        </div>

        {/* The Decisive Cards Spotlight */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-8 my-3 sm:my-6">
          {/* 1. HIGHEST CARD OF THAT ROUND (First) */}
          {highestLeadCard ? (
            <div className="flex flex-col items-center">
              <span className="text-[9px] sm:text-xs uppercase font-black tracking-wider text-amber-300 mb-1 bg-amber-950/90 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-amber-500/60 shadow-lg flex items-center gap-1">
                <span>👑</span> Highest
              </span>
              <div className="transform rotate-[-3deg] hover:rotate-0 transition-transform">
                <CardView card={highestLeadCard} scale={0.88} />
              </div>
              <span className="mt-1 text-[10px] sm:text-xs font-extrabold text-amber-200 bg-black/70 px-2 py-0.5 rounded-md border border-amber-500/30 truncate max-w-[90px] sm:max-w-none">
                {pickerName}
              </span>
            </div>
          ) : null}

          {/* Action Divider */}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="text-xl sm:text-3xl font-black text-rose-500 animate-pulse">⚡</span>
          </div>

          {/* 2. THULLA CARD GIVEN (Second) */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] sm:text-xs uppercase font-black tracking-wider text-rose-300 mb-1 bg-red-950/90 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-rose-500/60 shadow-lg flex items-center gap-1">
              <span>🗡️</span> Thulla
            </span>
            <div className="transform rotate-[3deg] hover:rotate-0 transition-transform">
              <CardView card={cutCard} scale={0.88} />
            </div>
            <span className="mt-1 text-[10px] sm:text-xs font-extrabold text-rose-200 bg-black/70 px-2 py-0.5 rounded-md border border-rose-500/30 truncate max-w-[90px] sm:max-w-none">
              {cutterName}
            </span>
          </div>
        </div>

        <span className="mt-1 text-[10px] sm:text-xs font-medium text-amber-300/60 uppercase tracking-widest animate-pulse">
          Tap anywhere to continue
        </span>
      </div>
    </div>
  );
};
