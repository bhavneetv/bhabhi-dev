import React, { useState } from 'react';
import type { LastTrickSummary, Player } from '../types/game';
import { CardView } from './CardView';
import { RotateCcw, X, ShieldCheck, Flame, History } from 'lucide-react';

interface LastTurnModalProps {
  lastTrick: LastTrickSummary | null;
  players: Player[];
  allTricksHistory?: LastTrickSummary[];
  onClose: () => void;
}

export const LastTurnModal: React.FC<LastTurnModalProps> = ({
  lastTrick,
  players,
  allTricksHistory = [],
  onClose,
}) => {
  const [replayStep, setReplayStep] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'last' | 'all'>('last');

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const startReplay = () => {
    if (!lastTrick) return;
    setReplayStep(0);
    const total = lastTrick.plays.length;
    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current >= total) {
        clearInterval(interval);
        setTimeout(() => setReplayStep(null), 1000);
      } else {
        setReplayStep(current);
      }
    }, 450);
  };

  if (!lastTrick) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="glass-panel p-6 rounded-2xl max-w-sm w-full text-center border border-white/10">
          <History className="w-10 h-10 text-amber-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-white mb-1">No Previous Trick Yet</h3>
          <p className="text-sm text-slate-400 mb-4">The first trick of the game is still underway.</p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const leader = getPlayer(lastTrick.leaderId);
  const winner = lastTrick.winnerId ? getPlayer(lastTrick.winnerId) : null;
  const picker = lastTrick.pickerId ? getPlayer(lastTrick.pickerId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel rounded-2xl max-w-2xl w-full p-5 sm:p-6 border border-amber-500/30 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              L
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Last Turn Review
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                  {lastTrick.outcome === 'thulla' ? 'Thulla Cut' : 'Clean Trick'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Led by <strong className="text-white">{leader?.name || 'Leader'}</strong> with suit{' '}
                <span className="text-amber-400 uppercase font-bold">{lastTrick.leadSuit}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startReplay}
              disabled={replayStep !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/40 transition"
              title="Mini Replay"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View mode toggle if history exists */}
        {allTricksHistory.length > 1 && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setViewMode('last')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                viewMode === 'last' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Last Trick Only
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                viewMode === 'all' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Full Round History ({allTricksHistory.length})
            </button>
          </div>
        )}

        {/* Plays in chronological sequence */}
        <div className="flex-1 overflow-y-auto pr-1">
          {viewMode === 'last' ? (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Played in order (Left to Right):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pb-3">
                {lastTrick.plays.map((play, idx) => {
                  const player = getPlayer(play.playerId);
                  const isVisible = replayStep === null || idx <= replayStep;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center bg-slate-900/60 p-2.5 rounded-xl border transition-all ${
                        play.isThulla
                          ? 'border-red-500/80 bg-red-950/30'
                          : play.playerId === lastTrick.winnerId
                          ? 'border-amber-400/80 bg-amber-950/20'
                          : 'border-white/5'
                      } ${!isVisible ? 'opacity-20 scale-95' : 'opacity-100 scale-100'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">{player?.avatar || '👤'}</span>
                        <span className="text-xs font-bold text-white truncate max-w-[70px]">
                          {player?.name || 'Player'}
                        </span>
                      </div>

                      <CardView card={play.card} scale={0.8} />

                      {play.isThulla ? (
                        <span className="mt-1.5 text-[10px] font-extrabold text-red-400 uppercase bg-red-950 px-1.5 py-0.5 rounded border border-red-500/40">
                          💥 THULLA
                        </span>
                      ) : idx === 0 ? (
                        <span className="mt-1.5 text-[10px] font-bold text-amber-300 uppercase">
                          Lead
                        </span>
                      ) : play.playerId === lastTrick.winnerId ? (
                        <span className="mt-1.5 text-[10px] font-bold text-emerald-400 uppercase">
                          Highest
                        </span>
                      ) : (
                        <span className="mt-1.5 text-[10px] text-slate-400">#{idx + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Outcome Banner */}
              <div
                className={`mt-3 p-3.5 rounded-xl border flex items-center gap-3 ${
                  lastTrick.outcome === 'thulla'
                    ? 'bg-red-950/50 border-red-500/40 text-red-200'
                    : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                }`}
              >
                {lastTrick.outcome === 'thulla' ? (
                  <Flame className="w-6 h-6 text-red-400 flex-shrink-0" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                )}
                <div className="text-xs sm:text-sm">
                  {lastTrick.outcome === 'thulla' ? (
                    <span>
                      <strong>{picker?.name || 'Player'}</strong> had the highest lead card and{' '}
                      <strong>picked up {lastTrick.pickedCount || lastTrick.plays.length} cards</strong>!
                    </span>
                  ) : (
                    <span>
                      Clean trick! <strong>{winner?.name || 'Player'}</strong> won and all{' '}
                      <strong>{lastTrick.plays.length} cards</strong> were discarded to the dead pile.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Full round history list */
            <div className="space-y-2">
              {allTricksHistory.map((trick, tIdx) => {
                const tLeader = getPlayer(trick.leaderId);
                const tPicker = trick.pickerId ? getPlayer(trick.pickerId) : null;
                const tWinner = trick.winnerId ? getPlayer(trick.winnerId) : null;
                return (
                  <div key={tIdx} className="bg-slate-900/60 p-3 rounded-xl border border-white/5 text-xs">
                    <div className="flex items-center justify-between mb-1.5 font-bold">
                      <span className="text-amber-400">Trick #{tIdx + 1} — Led by {tLeader?.name}</span>
                      <span className={trick.outcome === 'thulla' ? 'text-red-400' : 'text-emerald-400'}>
                        {trick.outcome === 'thulla' ? 'Thulla Cut' : 'Clean'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {trick.plays.map((p, pIdx) => (
                        <div key={pIdx} className="flex-shrink-0 text-center">
                          <CardView card={p.card} scale={0.5} />
                          <span className="text-[9px] text-slate-400 truncate block w-10">
                            {getPlayer(p.playerId)?.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 text-slate-300 text-[11px]">
                      {trick.outcome === 'thulla'
                        ? `📦 ${tPicker?.name} picked up ${trick.pickedCount || trick.plays.length} cards.`
                        : `✅ ${tWinner?.name} won. Discarded to dead pile.`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
          <span>Keyboard shortcut: <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono">L</kbd></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
          >
            Back to Table
          </button>
        </div>
      </div>
    </div>
  );
};
