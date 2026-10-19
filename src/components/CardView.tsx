import React from 'react';
import type { Card, Suit, Theme } from '../types/game';

interface CardViewProps {
  card: Card;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  isLegal?: boolean;
  isMyTurn?: boolean;
  isPlayableRaised?: boolean;
  isBlurred?: boolean;
  onClick?: () => void;
  fourColorSuits?: boolean;
  theme?: Theme;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  isLegal: _isLegal = true,
  isMyTurn = false,
  isPlayableRaised = false,
  isBlurred = false,
  onClick,
  fourColorSuits = false,
  theme = 'emerald',
  scale = 1,
  className = '',
  style = {},
}) => {
  // Determine suit color
  const getSuitColor = (suit: Suit): string => {
    if (fourColorSuits) {
      switch (suit) {
        case 'spades':
          return '#1e293b'; // Slate / Black
        case 'hearts':
          return '#e11d48'; // Rose Red
        case 'diamonds':
          return '#2563eb'; // Royal Blue
        case 'clubs':
          return '#059669'; // Emerald Green
      }
    }
    return suit === 'hearts' || suit === 'diamonds' ? '#dc2626' : '#0f172a';
  };

  const getSuitSymbol = (suit: Suit): string => {
    switch (suit) {
      case 'spades':
        return '♠';
      case 'hearts':
        return '♥';
      case 'diamonds':
        return '♦';
      case 'clubs':
        return '♣';
    }
  };

  const suitColor = getSuitColor(card.suit);
  const symbol = getSuitSymbol(card.suit);
  const isCourt = ['J', 'Q', 'K', 'A'].includes(card.rank);

  // Render Card Back
  if (faceDown) {
    return (
      <div
        className={`relative select-none rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400/40 card-3d ${className}`}
        style={{
          width: `${68 * scale}px`,
          height: `${100 * scale}px`,
          ...style,
        }}
        onClick={disabled ? undefined : onClick}
      >
        {/* Card Back Thematic Pattern */}
        {theme === 'emerald' && (
          <div className="w-full h-full bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 p-1 flex items-center justify-center">
            <div className="w-full h-full border border-amber-400/50 rounded-lg flex items-center justify-center bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:6px_6px]">
              <div className="w-7 h-7 rounded-full border border-amber-400/60 bg-emerald-950/80 flex items-center justify-center shadow-inner">
                <span className="text-amber-300 text-xs font-serif font-black">♠</span>
              </div>
            </div>
          </div>
        )}
        {theme === 'crimson' && (
          <div className="w-full h-full bg-gradient-to-br from-rose-950 via-red-950 to-stone-950 p-1 flex items-center justify-center">
            <div className="w-full h-full border border-yellow-500/50 rounded-lg flex items-center justify-center bg-[radial-gradient(#eab308_1px,transparent_1px)] [background-size:6px_6px]">
              <div className="w-7 h-7 rounded-full border border-yellow-500/60 bg-red-950/80 flex items-center justify-center shadow-inner">
                <span className="text-yellow-400 text-xs font-serif font-black">👑</span>
              </div>
            </div>
          </div>
        )}
        {theme === 'cyber' && (
          <div className="w-full h-full bg-gradient-to-br from-slate-950 via-cyan-950 to-indigo-950 p-1 flex items-center justify-center">
            <div className="w-full h-full border border-cyan-400/60 rounded-lg flex items-center justify-center bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:6px_6px]">
              <div className="w-7 h-7 rounded-full border border-cyan-400 bg-slate-950 flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.5)]">
                <span className="text-cyan-400 text-xs font-mono font-bold">⚡</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Face-Up Card
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        relative select-none rounded-xl overflow-hidden
        bg-white border border-stone-300 shadow-md
        card-3d transition-all duration-300 ease-out
        ${selected ? 'ring-4 ring-amber-300 border-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.85),0_18px_32px_rgba(0,0,0,0.6)] scale-105 z-40' : ''}
        ${isPlayableRaised && !selected ? 'playable-card-lift ring-2 ring-amber-400 border-amber-300 cursor-pointer hover:scale-105 hover:brightness-105 z-20' : ''}
        ${isBlurred ? 'cursor-not-allowed select-none' : ''}
        ${!isMyTurn && !selected ? 'hover:-translate-y-1 cursor-default' : ''}
        ${className}
      `}
      style={{
        width: `${68 * scale}px`,
        height: `${100 * scale}px`,
        color: suitColor,
        ...style,
      }}
    >
      {/* Delicate inner hairline frame */}
      <div className="absolute inset-1 rounded-[8px] border border-black/5 pointer-events-none" />

      {/* Subtle glossy card sheen reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-black/5 pointer-events-none" />

      {/* Playable Indicator Glow Pip */}
      {isPlayableRaised && !selected && (
        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 ring-1 ring-white shadow-[0_0_8px_rgba(245,158,11,1)]" />
      )}

      {/* Top Left Rank & Suit (Scaled and high z-index so it's always clearly visible) */}
      <div
        className="absolute flex flex-col items-center leading-none z-20 pointer-events-none"
        style={{
          top: `${Math.max(2, Math.round(3.5 * scale))}px`,
          left: `${Math.max(2.5, Math.round(4.5 * scale))}px`,
        }}
      >
        <span
          className="font-black tracking-tighter"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: `${Math.max(12, Math.round(17 * scale))}px`,
            lineHeight: 1,
            color: suitColor,
          }}
        >
          {card.rank}
        </span>
        <span
          className="leading-none"
          style={{
            fontSize: `${Math.max(11, Math.round(14 * scale))}px`,
            marginTop: `${Math.round(-1 * scale)}px`,
            color: suitColor,
          }}
        >
          {symbol}
        </span>
      </div>

      {/* Bottom Right Inverted Rank & Suit (Mirrored 180°) */}
      <div
        className="absolute flex flex-col items-center leading-none z-20 pointer-events-none rotate-180"
        style={{
          bottom: `${Math.max(2, Math.round(3.5 * scale))}px`,
          right: `${Math.max(2.5, Math.round(4.5 * scale))}px`,
        }}
      >
        <span
          className="font-black tracking-tighter"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: `${Math.max(12, Math.round(17 * scale))}px`,
            lineHeight: 1,
            color: suitColor,
          }}
        >
          {card.rank}
        </span>
        <span
          className="leading-none"
          style={{
            fontSize: `${Math.max(11, Math.round(14 * scale))}px`,
            marginTop: `${Math.round(-1 * scale)}px`,
            color: suitColor,
          }}
        >
          {symbol}
        </span>
      </div>

      {/* Center Art or Big Pips (Guaranteed Not to Obscure Corner Indices or Suit Shape) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        {card.rank === 'A' ? (
          <div className="flex flex-col items-center">
            <span
              className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)] leading-none font-serif"
              style={{
                fontSize: `${Math.max(24, Math.round(36 * scale))}px`,
                color: suitColor,
              }}
            >
              {symbol}
            </span>
            {card.suit === 'spades' && (
              <span
                className="font-sans uppercase tracking-widest text-amber-700 font-extrabold bg-amber-100/90 rounded border border-amber-300/60 leading-tight"
                style={{
                  fontSize: `${Math.max(6, Math.round(7.5 * scale))}px`,
                  padding: `1px ${Math.max(2, Math.round(3 * scale))}px`,
                  marginTop: `${Math.round(2 * scale)}px`,
                }}
              >
                MASTER
              </span>
            )}
          </div>
        ) : isCourt ? (
          /* Face Cards (K, Q, J): Royal Frame with Bold Rank, Royal Emblem, and LARGE SUIT SHAPE */
          <div
            className="flex flex-col items-center justify-between rounded-md border border-amber-400/50 bg-gradient-to-b from-amber-50/70 via-white/90 to-amber-100/70 shadow-sm"
            style={{
              width: `${Math.round(32 * scale)}px`,
              height: `${Math.round(48 * scale)}px`,
              padding: `${Math.max(1, Math.round(2 * scale))}px`,
            }}
          >
            {/* Top Row: Mini Rank + Royal Crown */}
            <div className="flex items-center justify-center gap-0.5 leading-none w-full">
              <span
                className="font-black leading-none"
                style={{
                  fontSize: `${Math.max(9, Math.round(11 * scale))}px`,
                  fontFamily: 'Outfit, sans-serif',
                  color: suitColor,
                }}
              >
                {card.rank}
              </span>
              <span
                className="leading-none"
                style={{ fontSize: `${Math.max(8, Math.round(10 * scale))}px` }}
              >
                {card.rank === 'K' ? '👑' : card.rank === 'Q' ? '👸' : '⚔️'}
              </span>
            </div>

            {/* Prominent Center Suit Shape: Crisp, Large & Beautifully Colored */}
            <span
              className="leading-none filter drop-shadow-sm font-serif select-none"
              style={{
                fontSize: `${Math.max(16, Math.round(22 * scale))}px`,
                color: suitColor,
              }}
            >
              {symbol}
            </span>

            {/* Bottom Row: Inverted Mini Rank + Royal Crown */}
            <div className="flex items-center justify-center gap-0.5 leading-none rotate-180 w-full">
              <span
                className="font-black leading-none"
                style={{
                  fontSize: `${Math.max(9, Math.round(11 * scale))}px`,
                  fontFamily: 'Outfit, sans-serif',
                  color: suitColor,
                }}
              >
                {card.rank}
              </span>
              <span
                className="leading-none"
                style={{ fontSize: `${Math.max(8, Math.round(10 * scale))}px` }}
              >
                {card.rank === 'K' ? '👑' : card.rank === 'Q' ? '👸' : '⚔️'}
              </span>
            </div>
          </div>
        ) : (
          /* Number Cards (2..10): Large Center Pip */
          <div className="flex flex-col items-center justify-center opacity-90">
            <span
              className="filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)] leading-none font-serif"
              style={{
                fontSize: `${Math.max(18, Math.round(28 * scale))}px`,
                color: suitColor,
              }}
            >
              {symbol}
            </span>
          </div>
        )}
      </div>

      {/* Selected Indicator Inset Glow */}
      {selected && (
        <div className="absolute inset-0 border-2 border-amber-400 rounded-xl pointer-events-none shadow-[inset_0_0_12px_rgba(245,158,11,0.5)]" />
      )}
    </div>
  );
};
