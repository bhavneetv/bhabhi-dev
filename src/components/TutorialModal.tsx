import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '1. The Goal: Get Rid of Your Cards!',
      emoji: '🃏',
      content:
        'Bhabhi (also called Thulla, Bhabhi Dever, or Get Away) is a shedding card game. Your objective is simple: be among the first to empty your hand! The very last player left holding cards is crowned the "Bhabhi" (the loser of the match)!',
      tip: 'The first person to shed all their cards wins 1st place (Dever)!',
    },
    {
      title: '2. The Sacred Ace of Spades (A♠)',
      emoji: '♠️',
      content:
        'The game begins immediately after dealing. The player who holds the Ace of Spades (A♠) MUST start the first trick by leading with this card. Play then rotates clockwise around the table.',
      tip: 'In a 2-deck game with two Aces of Spades, the player with the lower seat number leads.',
    },
    {
      title: '3. Follow Suit & Clean Tricks',
      emoji: '🎯',
      content:
        'The leader plays any card to establish the "Lead Suit". Every other player MUST follow suit if they have a card of that suit. If everyone follows suit, the highest card wins the trick, and all cards are discarded into the Dead Pile!',
      tip: 'Card rankings: A (high) > K > Q > J > 10 > ... > 2 (low). Off-suit cards never win.',
    },
    {
      title: '4. The Legendary "THULLA" Moment!',
      emoji: '💥',
      content:
        'If it is your turn and you hold NO cards of the lead suit, you can play ANY card from your hand! This is called a THULLA! The trick stops immediately. The player who played the HIGHEST lead-suit card in that trick must pick up EVERY card on the table into their hand!',
      tip: 'Use Thullas strategically to dump high cards (like Aces or Kings of other suits) into an opponent’s hand!',
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-amber-500/40 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-white">How To Play Bhabhi</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="flex-1 flex flex-col items-center text-center py-3">
          <div className="text-5xl mb-3 animate-bounce">{current.emoji}</div>
          <h3 className="text-lg sm:text-xl font-extrabold text-amber-300 mb-2">
            {current.title}
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {current.content}
          </p>
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200/90 text-left w-full">
            <strong className="text-amber-400 block mb-0.5">💡 Strategy Tip:</strong>
            {current.tip}
          </div>
        </div>

        {/* Navigation Step Dots */}
        <div className="flex items-center justify-center gap-2 my-4">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === step ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Footer Next/Prev */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-1 transition shadow-lg"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition shadow-lg"
            >
              Let&apos;s Play!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
