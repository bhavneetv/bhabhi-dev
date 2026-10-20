import React from 'react';
import type { Trick, Card, Suit, Player } from '../types/game';
import { CardView } from './CardView';
import { ShieldAlert, Sparkles } from 'lucide-react';

export interface ThullaBannerInfo {
  cutterName: string;
  pickerName: string;
  cutCard: Card;
  highestLeadCard?: Card;
  pickedCount: number;
}

export interface CleanBannerInfo {
  winnerName: string;
  winningCard: Card;
}

interface TableCenterProps {
  trick: Trick;
  deadPile?: Card[];
  players: Player[];
  leadSuit?: Suit | null;
  deckCount?: 1 | 2;
  fourColorSuits?: boolean;
  manualPickupRequired?: boolean;
  onManualPickup?: () => void;
  pickerName?: string;
  thullaBanner?: ThullaBannerInfo | null;
  cleanBanner?: CleanBannerInfo | null;
  isDiscarding?: boolean;
  flyingCardIds?: Set<string>;
}

export const TableCenter: React.FC<TableCenterProps> = ({
  trick,
  players,
  fourColorSuits = false,
  manualPickupRequired = false,
  onManualPickup,
  pickerName,
  cleanBanner,
  isDiscarding = false,
  flyingCardIds,
}) => {
  const getPlayer = (id: string) => players.find((p) => p.id === id);

  // Cards currently flying in the air MUST NOT be rendered on the table felt prematurely
  const visiblePlays = flyingCardIds && flyingCardIds.size > 0
    ? trick.plays.filter((p) => !flyingCardIds.has(p.card.id))
    : trick.plays;

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-[180px] sm:min-h-[250px] pointer-events-auto">
      {/* Clean Trick Winner Banner */}
      {cleanBanner && (
        <div className="absolute -top-4 z-40 px-4 py-1.5 rounded-full bg-emerald-950/95 border border-emerald-400/70 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce text-emerald-200 text-xs sm:text-sm font-black">
          <span>✨</span>
          <span>{cleanBanner.winnerName} takes the trick!</span>
        </div>
      )}

      {/* Center Trick Played Cards Fan (with Discard Sweep Animation) */}
      <div className={`relative flex items-center justify-center w-full h-40 ${isDiscarding ? 'animate-discard-sweep' : ''}`}>
        {visiblePlays.length === 0 ? (
          <div className="flex flex-col items-center justify-center opacity-30 select-none">
            <div className="w-10 h-10 rounded-full border border-dashed border-white/25 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300/80 animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            {visiblePlays.map((play, index) => {
              const player = getPlayer(play.playerId);
              const total = visiblePlays.length;
              const angle = total > 1 ? (index - (total - 1) / 2) * 14 : 0;
              const xOffset = total > 1 ? (index - (total - 1) / 2) * 28 : 0;
              const yOffset = total > 1 ? Math.abs(index - (total - 1) / 2) * 4 : 0;

              return (
                <div
                  key={play.card.id}
                  className="absolute flex flex-col items-center transition-all duration-300"
                  style={{
                    transform: `translateX(${xOffset}px) translateY(${yOffset}px) rotate(${angle}deg)`,
                    zIndex: play.isThulla ? 30 : index + 10,
                  }}
                >
                  <CardView
                    card={play.card}
                    fourColorSuits={fourColorSuits}
                    scale={0.92}
                    className={`shadow-2xl ${
                      play.isThulla
                        ? 'ring-4 ring-red-500 ring-offset-2 ring-offset-black scale-105 shadow-[0_0_20px_rgba(239,68,68,0.8)]'
                        : ''
                    }`}
                  />

                  {/* Player Name chip */}
                  <span
                    className={`mt-1.5 px-2 py-0.5 text-[9px] font-bold rounded-full truncate max-w-[80px] shadow ${
                      play.isThulla
                        ? 'bg-gradient-to-r from-red-700 to-amber-600 text-white border border-yellow-300 font-black shadow-lg scale-105'
                        : 'bg-slate-950/85 border border-white/20 text-white'
                    }`}
                  >
                    {player?.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Pick-up Button Prompt (Only shown when manual pickup setting active) */}
      {manualPickupRequired && onManualPickup && (
        <div className="absolute z-30 flex flex-col items-center animate-bounce">
          <button
            onClick={onManualPickup}
            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-2xl border border-yellow-300/60 flex items-center gap-2 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{pickerName || 'Picker'}, Tap To Collect Cards</span>
          </button>
        </div>
      )}
    </div>
  );
};
