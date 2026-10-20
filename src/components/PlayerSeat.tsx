import React from 'react';
import type { Player, Theme } from '../types/game';
import { CardView } from './CardView';
import { Crown, Bot, AlertTriangle, CheckCircle, Volume2, Wifi, WifiOff } from 'lucide-react';

interface PlayerSeatProps {
  player: Player;
  isCurrentTurn: boolean;
  timeLeft?: number;
  totalTime?: number;
  theme?: Theme;
  isLocalPlayer?: boolean;
  statusBadge?: { label: string; color: 'red' | 'amber' | 'emerald' | 'blue' } | null;
  canRename?: boolean;
  onRename?: () => void;
  onSelect?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentTurn,
  timeLeft,
  totalTime,
  theme = 'emerald',
  isLocalPlayer = false,
  statusBadge = null,
  canRename = false,
  onRename,
  onSelect,
  style = {},
  className = '',
}) => {
  const cardCount = player.cards.length;
  const isOneCard = !player.isOut && cardCount === 1;
  const isLowCards = !player.isOut && cardCount > 1 && cardCount <= 3;

  const hasTurnActive = isCurrentTurn && !player.isOut && player.cards.length > 0;

  // Turn timer percentage for radial ring
  const timerPercent =
    totalTime && timeLeft !== undefined && totalTime > 0
      ? Math.max(0, Math.min(100, (timeLeft / totalTime) * 100))
      : 100;

  return (
    <div
      onClick={onSelect}
      style={style}
      className={`relative flex flex-col items-center select-none transition-all duration-300 ${
        hasTurnActive ? 'scale-105 z-20' : 'z-10'
      } ${className}`}
    >
      {/* Dynamic Status Badge (e.g. CUTTER or TAKES PILE) */}
      {statusBadge && (
        <div
          className={`absolute -top-7 whitespace-nowrap text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-2xl animate-bounce z-40 border ${
            statusBadge.color === 'red'
              ? 'bg-red-600 border-yellow-300 ring-2 ring-red-400'
              : statusBadge.color === 'amber'
              ? 'bg-amber-600 border-yellow-200 ring-2 ring-amber-400'
              : statusBadge.color === 'emerald'
              ? 'bg-emerald-600 border-emerald-300'
              : 'bg-blue-600 border-blue-300'
          }`}
        >
          {statusBadge.label}
        </div>
      )}

      {/* 1-Card Warning Alert Banner */}
      {!statusBadge && isOneCard && (
        <div className="absolute -top-6 whitespace-nowrap bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(225,29,72,0.8)] animate-bounce flex items-center gap-1 z-30">
          <AlertTriangle className="w-3 h-3" />
          <span>LAST CARD!</span>
        </div>
      )}

      {/* Out / Safe Ribbon Banner */}
      {!statusBadge && player.isOut && (
        <div className="absolute -top-6 whitespace-nowrap bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 z-30">
          <CheckCircle className="w-3 h-3 text-emerald-950" />
          <span>SAFE #{player.finishPosition || 1}</span>
        </div>
      )}

      {/* Main Avatar Bubble */}
      <div className="relative">
        {/* Turn radial ring countdown */}
        {hasTurnActive && totalTime && totalTime > 0 ? (
          <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90 pointer-events-none">
            <circle
              cx="50%"
              cy="50%"
              r="46%"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="3"
            />
            <circle
              cx="50%"
              cy="50%"
              r="46%"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeDasharray="100"
              strokeDashoffset={100 - timerPercent}
              strokeLinecap="round"
              className="transition-all duration-200"
            />
          </svg>
        ) : null}

        {/* Turn Glow Aura */}
        {hasTurnActive && (
          <div className="absolute -inset-1.5 rounded-full bg-amber-400/40 blur-md animate-pulse pointer-events-none" />
        )}

        {/* Speaking Voice Aura and Equalizer Rings */}
        {player.isSpeaking && (
          <>
            <div className="absolute -inset-2.5 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none opacity-75" />
            <div className="absolute -inset-1 rounded-full ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] pointer-events-none" />
          </>
        )}

        {/* Avatar Circle */}
        <div
          className={`
            w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-2xl sm:text-3xl
            border-2 shadow-xl backdrop-blur-md transition-all
            ${
              statusBadge?.color === 'red'
                ? 'bg-red-950/90 border-red-500 ring-4 ring-red-400/80 shadow-[0_0_25px_rgba(239,68,68,0.8)]'
                : statusBadge?.color === 'amber'
                ? 'bg-amber-950/90 border-amber-400 ring-4 ring-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.8)]'
                : player.isSpeaking
                ? 'bg-emerald-950/90 border-emerald-400 ring-4 ring-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.8)]'
                : player.isOut
                ? 'bg-slate-900/90 border-emerald-500/50 grayscale-[50%]'
                : hasTurnActive
                ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                : 'bg-slate-900/80 border-white/20 hover:border-white/40'
            }
          `}
        >
          {player.avatar || '👤'}

          {/* Host Crown */}
          {player.isHost && (
            <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
              <Crown className="w-3 h-3 fill-current" />
            </div>
          )}

          {/* Bot Indicator */}
          {player.isBot && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-cyan-400 border border-cyan-400/50 flex items-center justify-center shadow">
              <Bot className="w-3 h-3" />
            </div>
          )}

          {/* Speaking Mic icon */}
          {player.isSpeaking && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow animate-pulse">
              <Volume2 className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Animated Card Count Badge */}
        {!player.isOut && (
          <div
            className={`
              absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-xs font-black shadow-lg border animate-count-bounce
              flex items-center gap-0.5
              ${
                isOneCard
                  ? 'bg-red-600 text-white border-white ring-2 ring-red-400/80 animate-pulse'
                  : isLowCards
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-slate-800 text-white border-white/20'
              }
            `}
          >
            <span>🂠</span>
            <span>{cardCount}</span>
          </div>
        )}
      </div>

      {/* Player Name and Role Label */}
      <div className="mt-2 flex flex-col items-center">
        <div
          onClick={canRename && onRename ? (e) => { e.stopPropagation(); onRename(); } : undefined}
          className={`
            text-xs sm:text-sm font-extrabold truncate max-w-[85px] sm:max-w-[110px] text-center px-2 py-0.5 rounded-md flex items-center justify-center gap-1
            ${
              canRename && onRename ? 'cursor-pointer hover:ring-1 hover:ring-amber-300' : ''
            }
            ${
              isCurrentTurn
                ? 'bg-amber-400 text-slate-950 font-black shadow'
                : 'bg-slate-950/70 text-white border border-white/10'
            }
          `}
          title={canRename ? 'Click to rename' : undefined}
        >
          <span className="truncate">{isLocalPlayer ? `${player.name} (You)` : player.name}</span>
          {canRename && <span className="text-[9px] opacity-70">✎</span>}
        </div>

        {/* WiFi Signal Strength Indicator */}
        <div
          className={`mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-tight border backdrop-blur-sm shadow-sm transition-all duration-300 ${
            player.isOnline === false
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-400'
              : (player.ping ?? 25) < 100
              ? 'bg-slate-900/80 border-emerald-500/30 text-emerald-400'
              : (player.ping ?? 25) <= 250
              ? 'bg-slate-900/80 border-amber-500/30 text-amber-400'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-400 animate-pulse'
          }`}
          title={
            player.isOnline === false
              ? 'Disconnected from server'
              : `Signal Latency: ${player.ping ?? 25}ms (${
                  (player.ping ?? 25) < 100 ? 'Good' : (player.ping ?? 25) <= 250 ? 'Fair' : 'Poor'
                })`
          }
        >
          {player.isOnline === false ? (
            <>
              <WifiOff className="w-2.5 h-2.5 text-rose-400" />
              <span>OFFLINE</span>
            </>
          ) : (
            <>
              <Wifi
                className={`w-2.5 h-2.5 ${
                  (player.ping ?? 25) < 100
                    ? 'text-emerald-400'
                    : (player.ping ?? 25) <= 250
                    ? 'text-amber-400'
                    : 'text-rose-400 animate-bounce'
                }`}
              />
              <span>{player.ping !== undefined ? `${player.ping}ms` : '24ms'}</span>
            </>
          )}
        </div>

        {/* Player connection status or Turn Status */}
        {player.isOnline === false ? (
          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider animate-pulse mt-0.5">
            Reconnecting...
          </span>
        ) : isCurrentTurn ? (
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 shadow-md flex items-center gap-1 ${
              timeLeft !== undefined && timeLeft <= 5
                ? 'bg-red-600 text-white animate-bounce ring-1 ring-white'
                : 'bg-amber-400 text-slate-950 animate-pulse'
            }`}
          >
            <span>⏱️</span>
            <span>
              {timeLeft !== undefined && timeLeft > 0 ? `${timeLeft}s left` : 'Playing...'}
            </span>
          </span>
        ) : null}
      </div>

      {/* Opponent Tiny Card Back Fan */}
      {!isLocalPlayer && !player.isOut && cardCount > 0 && (
        <div className="hidden sm:flex -space-x-3 mt-1 opacity-70 hover:opacity-100 transition-opacity">
          {Array.from({ length: Math.min(3, cardCount) }).map((_, i) => (
            <CardView
              key={i}
              card={player.cards[0] || { id: 'dummy', suit: 'spades', rank: 'A', deckIndex: 0, value: 14 }}
              faceDown
              theme={theme}
              scale={0.4}
              className="pointer-events-none shadow-md"
            />
          ))}
        </div>
      )}
    </div>
  );
};
