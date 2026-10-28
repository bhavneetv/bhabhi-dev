import React from 'react';
import type { Player, Theme, Card } from '../types/game';
import { Crown, Bot, AlertTriangle, Volume2, Wifi, WifiOff } from 'lucide-react';

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
  chatBubble?: { text: string; timestamp: number } | null;
  lastPlayedCard?: Card | null;
  style?: React.CSSProperties;
  className?: string;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentTurn,
  timeLeft,
  totalTime,
  theme: _theme = 'emerald',
  isLocalPlayer = false,
  statusBadge = null,
  canRename = false,
  onRename,
  onSelect,
  chatBubble = null,
  lastPlayedCard = null,
  style = {},
  className = '',
}) => {
  const cardCount = typeof player.cardCount === 'number' ? player.cardCount : player.cards.length;
  const isOneCard = !player.isOut && cardCount === 1;
  const isLowCards = !player.isOut && cardCount > 1 && cardCount <= 3;

  const hasTurnActive = isCurrentTurn && !player.isOut && cardCount > 0;

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
      {/* Dynamic Chat / Emoji Speech Bubble Menu (Shown to others, not to sender) */}
      {chatBubble && (
        <div className="absolute -top-14 sm:-top-16 z-50 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-90 duration-200">
          <div className="bg-slate-950/95 text-white border-2 border-amber-400/90 shadow-[0_4px_25px_rgba(0,0,0,0.85)] px-3 py-1 rounded-2xl max-w-[130px] sm:max-w-[170px] backdrop-blur-md flex items-center justify-center text-center">
            <span
              className={`font-black truncate ${
                chatBubble.text.length <= 4 ? 'text-lg sm:text-2xl' : 'text-[11px] sm:text-xs'
              }`}
            >
              {chatBubble.text}
            </span>
          </div>
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-amber-400/90 -mt-[1px]" />
        </div>
      )}

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
            <div className="absolute -inset-2 sm:-inset-2.5 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none opacity-75" />
            <div className="absolute -inset-1 rounded-full ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] pointer-events-none" />
          </>
        )}

        {/* Avatar Circle */}
        <div
          className={`
            w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl sm:text-3xl
            border-2 shadow-xl backdrop-blur-md transition-all relative overflow-hidden
            ${
              statusBadge?.color === 'red'
                ? 'bg-red-950/90 border-red-500 ring-4 ring-red-400/80 shadow-[0_0_25px_rgba(239,68,68,0.8)]'
                : statusBadge?.color === 'amber'
                ? 'bg-amber-950/90 border-amber-400 ring-4 ring-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.8)]'
                : player.isSpeaking
                ? 'bg-emerald-950/90 border-emerald-400 ring-4 ring-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.8)]'
                : player.isOut
                ? 'bg-slate-950/90 border-slate-700/80 grayscale opacity-60 ring-1 ring-white/10'
                : hasTurnActive
                ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                : 'bg-slate-900/80 border-white/20 hover:border-white/40'
            }
          `}
        >
          {player.isOut ? (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-amber-400 font-black text-xs sm:text-sm tracking-tight drop-shadow font-mono">
                #{player.finishPosition || 1}
              </span>
            </div>
          ) : (
            player.avatar || '👤'
          )}

          {/* Host Crown */}
          {player.isHost && (
            <div className="absolute -top-1 -left-1 sm:-top-1.5 sm:-left-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
              <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
            </div>
          )}

          {/* Bot Indicator */}
          {player.isBot && (
            <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-800 text-cyan-400 border border-cyan-400/50 flex items-center justify-center shadow">
              <Bot className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </div>
          )}

          {/* Speaking Mic icon */}
          {player.isSpeaking && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow animate-pulse">
              <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </div>
          )}
        </div>

        {/* Animated Card Count Badge (Clean number only, no card icon) */}
        {!player.isOut && (
          <div
            className={`
              absolute -bottom-1 -right-1 sm:-bottom-1.5 sm:-right-1.5 min-w-[20px] h-5 sm:min-w-[24px] sm:h-6 px-1.5 rounded-full text-[10px] sm:text-xs font-black shadow-lg border animate-count-bounce
              flex items-center justify-center
              ${
                isOneCard
                  ? 'bg-red-600 text-white border-white ring-2 ring-red-400/80 animate-pulse'
                  : isLowCards
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-slate-850 text-white border-white/20'
              }
            `}
          >
            <span>{cardCount}</span>
          </div>
        )}
        {/* Recent Card Played Badge: symbol and number only */}
        {lastPlayedCard && (
          <div
            className="absolute -bottom-1.5 -left-1.5 sm:-bottom-2 sm:-left-2 z-30 px-1.5 py-0.5 rounded-md bg-slate-950/95 border border-white/30 shadow-lg flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black pointer-events-none select-none animate-in fade-in zoom-in-75"
            title={`Recent card: ${lastPlayedCard.rank} of ${lastPlayedCard.suit}`}
          >
            <span className="text-white">{lastPlayedCard.rank}</span>
            <span className={lastPlayedCard.suit === 'hearts' || lastPlayedCard.suit === 'diamonds' ? 'text-rose-400' : 'text-cyan-300'}>
              {lastPlayedCard.suit === 'spades' ? '♠' : lastPlayedCard.suit === 'hearts' ? '♥' : lastPlayedCard.suit === 'diamonds' ? '♦' : '♣'}
            </span>
          </div>
        )}
      </div>

      {/* Player Name and Role Label */}
      <div className="mt-1 sm:mt-1.5 flex flex-col items-center">
        <div
          onClick={canRename && onRename ? (e) => { e.stopPropagation(); onRename(); } : undefined}
          className={`
            text-[10px] sm:text-xs font-extrabold truncate max-w-[68px] sm:max-w-[100px] text-center px-1.5 py-0.5 rounded-md flex items-center justify-center gap-0.5
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
    </div>
  );
};
