import React, { useEffect } from 'react';
import type { Player } from '../types/game';
import confetti from 'canvas-confetti';
import { soundSynth } from '../audio/soundSynth';
import { Trophy, RotateCcw, Home, Users, Share2 } from 'lucide-react';

interface ResultsModalProps {
  players: Player[];
  bhabhiPlayer: Player | null;
  neutralNames?: boolean;
  onRematch: () => void;
  onLobby: () => void;
  onHome?: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  players,
  bhabhiPlayer,
  neutralNames = false,
  onRematch,
  onLobby,
  onHome,
}) => {
  useEffect(() => {
    // Blast celebratory confetti for the winners
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignored if canvas-confetti context not available
    }

    // Play sad comedic horn for Bhabhi loser
    soundSynth.playBhabhiTrumpet();
  }, []);

  // Sort players by finish position (1st, 2nd, ... last)
  const sortedWinners = [...players]
    .filter((p) => p.isOut && p.finishPosition !== null)
    .sort((a, b) => (a.finishPosition || 99) - (b.finishPosition || 99));

  // Guarantee the Bhabhi loser is identified from either prop or remaining players
  const effectiveBhabhi =
    bhabhiPlayer ||
    players.find((p) => !p.isOut && ((p.cardCount ?? 0) > 0 || (p.cards && p.cards.length > 0))) ||
    players.find((p) => !p.finishPosition) ||
    players[players.length - 1] ||
    null;

  const loserTitle = neutralNames ? 'LOSER' : 'BHABHI';

  const shareToWhatsApp = () => {
    const loserName = effectiveBhabhi?.name || 'Someone';
    const winnerName = sortedWinners[0]?.name || 'Champion';
    const text = encodeURIComponent(
      `🃏 We just played Bhabhi Dever (Thulla) Online!\n🏆 ${winnerName} won 1st Place (Dever)!\n😭 ${loserName} got stuck holding the cards and is the ${loserTitle}!\nPlay with us now!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-5 sm:p-7 border border-amber-500/40 text-center relative my-auto shadow-2xl">
        {/* Confetti & Fireworks Header */}
        <div className="flex flex-col items-center select-none">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-xl mb-2 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Game Finished!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            All cards shed except for the final holder
          </p>
        </div>

        {/* BHABHI LOSER SPOTLIGHT (PRD §5.2) */}
        {effectiveBhabhi && (
          <div className="my-6 p-4 rounded-2xl bg-gradient-to-b from-red-950/80 via-slate-900/90 to-red-950/80 border-2 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.4)] relative overflow-hidden">
            <div className="text-4xl mb-1 animate-bounce">
              {effectiveBhabhi.avatar || '😭'}
            </div>
            <div className="text-xs uppercase font-extrabold text-red-400 tracking-widest">
              THE OFFICIAL
            </div>

            {/* Comic Stamp Slam */}
            <div className="animate-stamp-slam my-1">
              <h2
                className="text-4xl sm:text-5xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-red-600 filter drop-shadow"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                🚨 {loserTitle}! 🚨
              </h2>
            </div>

            <div className="text-lg font-black text-white mt-1">
              {effectiveBhabhi.name}
            </div>
            <div className="text-xs text-rose-200/80 font-medium mt-1">
              Held the last {effectiveBhabhi.cardCount ?? effectiveBhabhi.cards?.length ?? 0} cards at the table!
            </div>
          </div>
        )}

        {/* PODIUM OF FINISHERS */}
        <div className="mb-6 text-left">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Finish Rankings
          </h3>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {sortedWinners.map((winner, idx) => (
              <div
                key={winner.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                  idx === 0
                    ? 'bg-amber-950/40 border-amber-400/70 text-amber-200'
                    : 'bg-slate-900/60 border-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-950'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="text-base">{winner.avatar}</span>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-xs font-black text-amber-300">
                      Winner {idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-300 truncate max-w-[130px]">
                      {winner.name}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                  WINNER {idx + 1}
                </span>
              </div>
            ))}

            {/* Last Place: Official Bhabhi */}
            {effectiveBhabhi && (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-red-500/60 bg-red-950/40 text-red-200">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-red-600 text-white shadow">
                    💀
                  </span>
                  <span className="text-base">{effectiveBhabhi.avatar}</span>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-xs font-black text-red-400">
                      BHABHI (Loser of the Game)
                    </span>
                    <span className="text-[11px] font-semibold text-rose-200 truncate max-w-[130px]">
                      {effectiveBhabhi.name}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-black uppercase tracking-wider text-red-400 bg-red-950/80 px-2.5 py-0.5 rounded border border-red-500/60 animate-pulse">
                  🚨 BHABHI (LOSER)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Share Button (§7 note) */}
        <button
          onClick={shareToWhatsApp}
          className="w-full mb-3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Result on WhatsApp 💬</span>
        </button>

        {/* Action Buttons */}
        <div className={`grid ${onHome ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-2.5 sm:gap-3`}>
          <button
            onClick={onRematch}
            className="py-3 px-3 sm:px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          <button
            onClick={onLobby}
            className="py-3 px-3 sm:px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl border border-white/10 flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Lobby</span>
          </button>

          {onHome && (
            <button
              onClick={onHome}
              className="col-span-2 sm:col-span-1 py-3 px-3 sm:px-4 bg-slate-900/90 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl border border-white/10 flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>Main Menu</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
