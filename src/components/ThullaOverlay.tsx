import React, { useEffect } from 'react';
import type { Card } from '../types/game';
import { CardView } from './CardView';
import { soundSynth } from '../audio/soundSynth';

interface ThullaOverlayProps {
  cutterName: string;
  pickerName: string;
  cutCard: Card;
  highestLeadCard?: Card;
  pickedCount: number;
  onDismiss: () => void;
}

export const ThullaOverlay: React.FC<ThullaOverlayProps> = ({
  cutterName,
  pickerName,
  cutCard,
  highestLeadCard,
  pickedCount,
  onDismiss,
}) => {
  useEffect(() => {
    // Trigger epic cinematic sound and haptics
    soundSynth.playThullaBoom();

    const timer = setTimeout(() => {
      onDismiss();
    }, 2200);

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
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center animate-thulla-shake">
        {/* Giant Comic 3D Slamming "THULLA!" Title */}
        <div className="animate-stamp-slam select-none">
          <h1
            className="text-6xl sm:text-8xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-red-600 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]"
            style={{
              WebkitTextStroke: '3px #7f1d1d',
              fontFamily: 'Space Grotesk, Cinzel, sans-serif',
            }}
          >
            💥 THULLA!
          </h1>
          <div className="text-xl sm:text-2xl font-black text-amber-200 tracking-widest uppercase -mt-2 filter drop-shadow">
            THE CUT IS MADE!
          </div>
        </div>

        {/* The Decisive Cards Spotlight */}
        <div className="flex items-center justify-center gap-6 my-6">
          {/* The Off-Suit Cut Card */}
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase font-extrabold tracking-wider text-rose-300 mb-1 bg-red-950/70 px-2 py-0.5 rounded-full border border-rose-500/40">
              Cut by {cutterName}
            </span>
            <div className="transform rotate-[-6deg] hover:rotate-0 transition-transform">
              <CardView card={cutCard} scale={1.25} />
            </div>
          </div>

          <div className="text-2xl sm:text-4xl font-extrabold text-amber-400 animate-pulse">
            ➔
          </div>

          {/* The Punished Highest Card */}
          {highestLeadCard && (
            <div className="flex flex-col items-center">
              <span className="text-xs uppercase font-extrabold tracking-wider text-amber-300 mb-1 bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-500/40">
                Highest: {pickerName}
              </span>
              <div className="transform rotate-[6deg] hover:rotate-0 transition-transform">
                <CardView card={highestLeadCard} scale={1.25} />
              </div>
            </div>
          )}
        </div>

        {/* Narrative Description Banner */}
        <div className="bg-gradient-to-r from-red-900/90 via-black/80 to-red-900/90 border border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md max-w-md">
          <p className="text-base sm:text-lg font-bold text-white">
            <span className="text-amber-400">{cutterName}</span> threw an off-suit card!
          </p>
          <div className="mt-2 text-sm sm:text-base font-semibold text-rose-200 flex items-center justify-center gap-2">
            <span>📦</span>
            <span>
              <strong className="text-white font-extrabold">{pickerName}</strong> must pick up{' '}
              <span className="text-amber-300 font-black text-lg underline">{pickedCount} cards</span>!
            </span>
          </div>
        </div>

        <span className="mt-4 text-xs font-medium text-amber-300/60 uppercase tracking-widest animate-pulse">
          Tap anywhere to continue
        </span>
      </div>
    </div>
  );
};
