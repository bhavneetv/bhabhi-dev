import React from 'react';
import type { Card, Suit } from '../types/game';
import { SUITS, RANKS } from '../engine/bhabhiEngine';
import { X, Layers } from 'lucide-react';

interface CardTrackerModalProps {
  deadPile: Card[];
  deckCount: 1 | 2;
  fourColorSuits?: boolean;
  onClose: () => void;
}

export const CardTrackerModal: React.FC<CardTrackerModalProps> = ({
  deadPile,
  deckCount,
  fourColorSuits = false,
  onClose,
}) => {
  // Count how many copies of each suit-rank are in the dead pile
  const deadMap = new Map<string, number>();
  deadPile.forEach((c) => {
    const key = `${c.suit}-${c.rank}`;
    deadMap.set(key, (deadMap.get(key) || 0) + 1);
  });

  const getSuitSymbol = (suit: Suit) => {
    switch (suit) {
      case 'spades': return '♠';
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
    }
  };

  const getSuitColorClass = (suit: Suit) => {
    if (fourColorSuits) {
      switch (suit) {
        case 'spades': return 'text-slate-300';
        case 'hearts': return 'text-rose-500';
        case 'diamonds': return 'text-blue-400';
        case 'clubs': return 'text-emerald-400';
      }
    }
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-slate-200';
  };

  const totalCardsInDeck = deckCount * 52;
  const cardsInPlay = totalCardsInDeck - deadPile.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel rounded-2xl max-w-2xl w-full p-5 sm:p-6 border border-amber-500/30 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Card Tracker
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                  {deckCount === 2 ? 'Two Decks (104 Cards)' : 'Single Deck (52 Cards)'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Track dead cards discarded from clean tricks to deduce opponents&apos; hands
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Stats Bar */}
        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">In Play</span>
            <div className="text-xl font-black text-emerald-400">{cardsInPlay}</div>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Dead Pile</span>
            <div className="text-xl font-black text-rose-400">{deadPile.length}</div>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Deck</span>
            <div className="text-xl font-black text-amber-400">{totalCardsInDeck}</div>
          </div>
        </div>

        {/* Suits Matrix */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {SUITS.map((suit) => {
            const suitDeadCount = deadPile.filter((c) => c.suit === suit).length;
            const suitTotal = deckCount * 13;
            const suitRemaining = suitTotal - suitDeadCount;

            return (
              <div key={suit} className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${getSuitColorClass(suit)}`}>
                      {getSuitSymbol(suit)}
                    </span>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                      {suit}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    <strong className="text-white">{suitRemaining}</strong> / {suitTotal} alive
                  </span>
                </div>

                {/* Cards row */}
                <div className="grid grid-cols-13 gap-1 text-center">
                  {RANKS.map((rank) => {
                    const key = `${suit}-${rank}`;
                    const countDead = deadMap.get(key) || 0;
                    const isAllDead = countDead >= deckCount;
                    const isPartiallyDead = countDead > 0 && countDead < deckCount;

                    return (
                      <div
                        key={rank}
                        className={`py-1.5 px-0.5 rounded-md text-xs font-bold transition-all ${
                          isAllDead
                            ? 'bg-slate-950/80 text-slate-600 line-through border border-white/5'
                            : isPartiallyDead
                            ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-white border border-slate-700/60 shadow-sm'
                        }`}
                        title={`${rank} of ${suit}: ${countDead}/${deckCount} dead`}
                      >
                        {rank}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700 inline-block" /> In Play
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-950 line-through border border-white/10 inline-block" /> Dead
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
