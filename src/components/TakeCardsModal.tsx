import React from 'react';
import type { Player } from '../types/game';
import { X, Send, Download, ArrowLeftRight } from 'lucide-react';

interface TakeCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  localPlayer: Player;
  isMyTurn?: boolean;
  onGiveCards: (targetPlayer: Player) => void;
  onTakeCards: (targetPlayer: Player) => void;
}

export const TakeCardsModal: React.FC<TakeCardsModalProps> = ({
  isOpen,
  onClose,
  players,
  localPlayer,
  isMyTurn = false,
  onGiveCards,
  onTakeCards,
}) => {
  if (!isOpen) return null;

  const activeOpponents = players.filter(
    (p) => p.id !== localPlayer.id && !p.isOut
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl p-4 sm:p-5 text-white flex flex-col gap-3 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-amber-300 tracking-tight">
                Take / Swap Cards
              </h3>
              <p className="text-[11px] text-slate-400">
                Send a request to swap or take cards with an opponent (requires confirmation)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player List */}
        <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto py-1 pr-0.5">
          {activeOpponents.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-semibold">
              No active opponents available.
            </div>
          ) : (
            activeOpponents.map((opp) => {
              const oppCardCount = typeof opp.cardCount === 'number' ? opp.cardCount : opp.cards.length;
              const hasOppCards = oppCardCount > 0;
              const hasLocalCards = localPlayer.cards.length > 0;

              return (
                <div
                  key={opp.id}
                  className="p-3 bg-slate-950/80 border border-white/10 hover:border-amber-400/50 rounded-2xl transition flex flex-col gap-2.5 shadow-sm"
                >
                  {/* Player Header: Avatar + Full Name + Cards Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/15 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                        {opp.avatar}
                      </div>
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-white">
                          {opp.name}
                        </p>
                        {opp.isHost && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            Host
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cards Count Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap flex-shrink-0 ${
                      hasOppCards
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-500 border-white/5'
                    }`}>
                      🎴 {oppCardCount} {oppCardCount === 1 ? 'card' : 'cards'}
                    </span>
                  </div>

                  {/* Actions: Dedicated full-width 2-column buttons row */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                    <button
                      onClick={() => {
                        onGiveCards(opp);
                        onClose();
                      }}
                      disabled={!hasLocalCards || isMyTurn}
                      className="w-full py-2 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow cursor-pointer whitespace-nowrap"
                      title={
                        isMyTurn
                          ? 'Cannot give cards while it is your turn to play'
                          : hasLocalCards
                          ? `Send request to give all your ${localPlayer.cards.length} cards to ${opp.name}`
                          : 'You have no cards to give'
                      }
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Give Cards</span>
                    </button>

                    <button
                      onClick={() => {
                        onTakeCards(opp);
                        onClose();
                      }}
                      disabled={!hasOppCards}
                      className="w-full py-2 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow cursor-pointer whitespace-nowrap"
                      title={hasOppCards ? `Send request to take all ${oppCardCount} cards from ${opp.name}` : `${opp.name} has no cards left`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Take Cards</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-white/10 pt-2.5 flex items-center justify-between text-[11px] text-slate-400">
          <span>Your hand: <strong className="text-white font-mono">{localPlayer.cards.length} cards</strong></span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-bold transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
