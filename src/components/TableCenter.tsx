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

// Arrange opponents in consistent clockwise seating order relative to local player
export const getClockwiseOpponents = (allPlayers: Player[], localId: string): Player[] => {
  const localIndex = allPlayers.findIndex((p) => p.id === localId);
  if (localIndex === -1) {
    return allPlayers.filter((p) => p.id !== localId);
  }
  const n = allPlayers.length;
  const ordered: Player[] = [];
  for (let step = 1; step < n; step++) {
    const opp = allPlayers[(localIndex + step) % n];
    if (opp && opp.id !== localId) {
      ordered.push(opp);
    }
  }
  return ordered;
};

export interface CardTablePosition {
  leftPct: number;
  topPct: number;
  rotationDeg: number;
  left: string;
  top: string;
  transform: string;
}

// Shared position in the MIDDLE of table with same radial layout and player facing
export const getCardTablePosition = (
  playerId: string,
  localPlayerId: string,
  players: Player[]
): CardTablePosition => {
  if (!localPlayerId || playerId === localPlayerId) {
    return {
      leftPct: 50,
      topPct: 56,
      rotationDeg: 0,
      left: '50%',
      top: '56%',
      transform: 'translate(-50%, -50%) rotate(0deg)',
    };
  }

  const opponents = getClockwiseOpponents(players, localPlayerId);
  const oppIndex = opponents.findIndex((p) => p.id === playerId);
  if (oppIndex === -1) {
    return {
      leftPct: 50,
      topPct: 50,
      rotationDeg: 0,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const count = opponents.length;
  const arcStart = 205;
  const arcEnd = -25;
  const step = count > 1 ? (arcStart - arcEnd) / (count - 1) : 0;
  const oppAngleDeg = count === 1 ? 90 : arcStart - oppIndex * step;
  const oppAngleRad = (oppAngleDeg * Math.PI) / 180;

  // Compact middle of table felt
  const cardRadiusX = count >= 6 ? 12 : 11;
  const cardRadiusY = count >= 6 ? 9.5 : 8.5;
  const leftPct = 50 + cardRadiusX * Math.cos(oppAngleRad);
  const topPct = 50 - cardRadiusY * Math.sin(oppAngleRad);
  const rotationDeg = -(oppAngleDeg - 90);

  return {
    leftPct,
    topPct,
    rotationDeg,
    left: `${leftPct}%`,
    top: `${topPct}%`,
    transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
  };
};

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
  localPlayerId?: string;
}

export const TableCenter: React.FC<TableCenterProps> = ({
  trick,
  players,
  fourColorSuits = false,
  manualPickupRequired = false,
  onManualPickup,
  pickerName,
  isDiscarding = false,
  flyingCardIds,
  localPlayerId = '',
}) => {
  // Cards currently flying in the air MUST NOT be rendered on the table felt prematurely
  const visiblePlays = flyingCardIds && flyingCardIds.size > 0
    ? trick.plays.filter((p) => !flyingCardIds.has(p.card.id))
    : trick.plays;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {/* Center Subtle Felt Ornament (when table is empty) */}
      {visiblePlays.length === 0 && (
        <div className="flex flex-col items-center justify-center opacity-20 select-none pointer-events-none">
          <div className="w-10 h-10 rounded-full border border-dashed border-white/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-300/80 animate-pulse" />
          </div>
        </div>
      )}

      {/* Played Cards positioned in MIDDLE of table, radially separated and facing towards each player */}
      {visiblePlays.map((play, index) => {
        const layout = getCardTablePosition(play.playerId, localPlayerId, players);

        return (
          <div
            key={play.card.id}
            className={`absolute pointer-events-auto transition-all duration-300 flex flex-col items-center ${
              isDiscarding ? 'animate-discard-sweep' : ''
            }`}
            style={{
              left: layout.left,
              top: layout.top,
              transform: layout.transform,
              zIndex: play.isThulla ? 35 : 15 + index,
            }}
          >
            <div className="relative group">
              <CardView
                card={play.card}
                fourColorSuits={fourColorSuits}
                scale={0.76}
                className={`shadow-2xl transition-transform ${
                  play.isThulla
                    ? 'ring-4 ring-red-500 ring-offset-2 ring-offset-black scale-105 shadow-[0_0_25px_rgba(239,68,68,0.95)]'
                    : 'group-hover:scale-105'
                }`}
              />

              {/* Thulla indicator badge */}
              {play.isThulla && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full border border-yellow-300 shadow-xl animate-pulse whitespace-nowrap">
                  💥 THULLA
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Manual Pick-up Button Prompt (Only shown when manual pickup setting active) */}
      {manualPickupRequired && onManualPickup && (
        <div className="absolute z-40 flex flex-col items-center animate-bounce pointer-events-auto">
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
