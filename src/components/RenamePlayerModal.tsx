import React, { useState } from 'react';
import type { Player } from '../types/game';
import { X, Check, Edit3, User } from 'lucide-react';

interface RenamePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  isHost: boolean;
  allPlayers: Player[];
  onRename: (playerId: string, newName: string) => void;
}

const QUICK_NAMES = ['Desi King', 'Royal Veer', 'Simran', 'Kabir', 'Ananya', 'Ace Hunter', 'Bhabhi Buster', 'Tiger'];

export const RenamePlayerModal: React.FC<RenamePlayerModalProps> = ({
  isOpen,
  onClose,
  player,
  isHost,
  allPlayers,
  onRename,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(player?.id || '');
  const [nameInput, setNameInput] = useState<string>(player?.name || '');

  // Keep state synced when player prop changes
  React.useEffect(() => {
    if (player) {
      setSelectedPlayerId(player.id);
      setNameInput(player.name.replace(' (You)', '').trim());
    }
  }, [player]);

  if (!isOpen) return null;

  const targetPlayer = allPlayers.find((p) => p.id === selectedPlayerId) || player;

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerId(id);
    const p = allPlayers.find((item) => item.id === id);
    if (p) {
      setNameInput(p.name.replace(' (You)', '').trim());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed || !targetPlayer) return;
    onRename(targetPlayer.id, trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-amber-400/40 rounded-3xl shadow-2xl p-5 text-white flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-300">
                {isHost ? 'Change Player Name' : 'Change Your Name'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {isHost ? 'Host can rename any player or bot' : 'Update your display name in game'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Host Player Picker Dropdown (if Host is changing someone else's name) */}
        {isHost && allPlayers.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Select Player to Rename:
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => handleSelectPlayer(e.target.value)}
              className="w-full bg-slate-950 border border-white/15 rounded-xl p-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
            >
              {allPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.avatar} {p.name} {p.isHost ? '(Host)' : p.isBot ? '(Bot)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Name Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3 text-amber-400" />
              <span>Display Name</span>
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={20}
              placeholder="Enter player name..."
              className="w-full bg-slate-950 border border-white/20 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner"
              autoFocus
            />
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-1">
              {QUICK_NAMES.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setNameInput(q)}
                  className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 text-slate-950 font-black text-xs shadow-lg transition flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Name</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
