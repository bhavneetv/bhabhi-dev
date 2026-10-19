import React, { useState } from 'react';
import type { Player, RoomSettings, Theme, BotDifficulty } from '../types/game';
import {
  Users,
  Copy,
  Check,
  Play,
  Settings,
  Share2,
  Crown,
  Bot,
  UserPlus,
  Trash2,
  HelpCircle,
  Palette,
  Edit3,
  Wifi,
  PlusCircle,
  LogIn,
  LogOut,
} from 'lucide-react';
import { RenamePlayerModal } from './RenamePlayerModal';

interface LobbyViewProps {
  roomCode: string;
  players: Player[];
  localPlayer: Player;
  settings: RoomSettings;
  theme: Theme;
  isOnlineConnected?: boolean;
  onThemeChange: (theme: Theme) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  onAddBot: (difficulty: BotDifficulty) => void;
  onRemovePlayer: (playerId: string) => void;
  onOpenTutorial: () => void;
  onJoinRoom?: (roomCode: string) => void;
  onCreateNewRoom?: () => void;
  onRenamePlayer?: (playerId: string, newName: string) => void;
  onLeaveRoom?: () => void;
  voiceBar?: React.ReactNode;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomCode,
  players,
  localPlayer,
  settings,
  theme,
  isOnlineConnected = true,
  onThemeChange,
  onUpdateSettings,
  onToggleReady,
  onStartGame,
  onAddBot,
  onRemovePlayer,
  onOpenTutorial,
  onJoinRoom,
  onCreateNewRoom,
  onRenamePlayer,
  onLeaveRoom,
  voiceBar,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [renameTargetPlayer, setRenameTargetPlayer] = useState<Player | null>(null);

  const isHost = localPlayer.isHost;
  const canStart = players.length >= 2;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    const text = encodeURIComponent(
      `🃏 Join my Bhabhi Dever (Thulla) game!\nRoom Code: *${roomCode}*\nPlay here from anywhere (even different WiFi): ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().toUpperCase();
    if (clean && onJoinRoom) {
      onJoinRoom(clean);
      setJoinCodeInput('');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-slate-950 to-black pointer-events-none" />

      {/* Main Container */}
      <div className="glass-panel rounded-3xl max-w-3xl w-full p-4 sm:p-8 border border-white/10 shadow-2xl relative z-10 flex flex-col my-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between pb-5 border-b border-white/10 gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-2xl font-serif">
                ♠
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Bhabhi Dever Online
                </h1>
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  Thulla
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isOnlineConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>
                  {isOnlineConnected ? 'Connected to Global Internet Relay' : 'Connecting to Relay...'}
                </span>
              </p>
            </div>
          </div>

          {/* Room Code Badge with Copy & Share */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-2 px-3 flex items-center gap-2.5 shadow-inner">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">
                  Room Code
                </span>
                <span className="text-lg sm:text-xl font-mono font-black text-amber-400 tracking-wider">
                  {roomCode}
                </span>
              </div>
              <button
                onClick={copyRoomCode}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={copyRoomLink}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 shadow transition cursor-pointer flex items-center gap-1.5"
              title="Copy Direct Join Link"
            >
              <Copy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold hidden sm:inline">Copy Link</span>
            </button>

            <button
              onClick={shareWhatsApp}
              className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition cursor-pointer flex items-center gap-1.5"
              title="Invite Friends via WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Invite</span>
            </button>

            {onLeaveRoom && (
              <button
                onClick={onLeaveRoom}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-white/10 shadow transition cursor-pointer flex items-center gap-1.5"
                title="Leave Room & Return to Menu"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Exit</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Multi-Network Join Bar */}
        <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-3 my-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 w-full sm:w-auto">
            <Wifi className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-white">Play With Remote Friends:</span>
            <span className="text-[10px] text-slate-400 hidden md:inline">
              (Works across different WiFis and mobile data)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Join Room Form */}
            {onJoinRoom && (
              <form onSubmit={handleJoinSubmit} className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter Room Code..."
                  maxLength={10}
                  className="bg-slate-950 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-amber-300 uppercase tracking-wider w-36 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={!joinCodeInput.trim()}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-black flex items-center gap-1 shadow cursor-pointer transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Join</span>
                </button>
              </form>
            )}

            {/* Create New Room Button */}
            {onCreateNewRoom && (
              <button
                onClick={onCreateNewRoom}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition flex items-center gap-1 cursor-pointer"
                title="Create a new private room"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">New Room</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Voice Chat in Lobby */}
        {voiceBar && (
          <div className="flex justify-center mb-3">
            {voiceBar}
          </div>
        )}

        {/* Players Seats Grid */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Players in Room ({players.length}/{settings.maxPlayers})</span>
            </h2>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenTutorial}
                className="px-2.5 py-1 text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition border border-white/5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Rules</span>
              </button>

              {isHost && players.length < settings.maxPlayers && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onAddBot('easy')}
                    className="px-2.5 py-1 text-xs font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 rounded-lg flex items-center gap-1 border border-cyan-500/40 transition cursor-pointer"
                    title="Add Easy Bot"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+Bot</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Grid of Players */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {players.map((p) => {
              const canEditName = p.id === localPlayer.id || isHost;
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    p.id === localPlayer.id
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-900/60 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="relative flex-shrink-0">
                      <span className="text-2xl">{p.avatar}</span>
                      {p.isHost && (
                        <span className="absolute -top-1 -left-1 text-amber-400">
                          <Crown className="w-3.5 h-3.5 fill-current" />
                        </span>
                      )}
                      {p.isBot && (
                        <span className="absolute -top-1 -right-1 text-cyan-400">
                          <Bot className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col truncate min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {p.name}
                        </span>
                        {canEditName && (
                          <button
                            onClick={() => setRenameTargetPlayer(p)}
                            className="p-0.5 text-slate-400 hover:text-amber-300 transition cursor-pointer flex-shrink-0"
                            title={p.id === localPlayer.id ? 'Change Your Name' : `Rename ${p.name}`}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {p.isHost
                          ? 'Host'
                          : p.isBot
                          ? `Bot (${p.botDifficulty})`
                          : p.id === localPlayer.id
                          ? 'You (Ready)'
                          : 'Live Player'}
                      </span>
                    </div>
                  </div>

                  {/* Host kick button for other players/bots */}
                  {isHost && p.id !== localPlayer.id && (
                    <button
                      onClick={() => onRemovePlayer(p.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer flex-shrink-0 ml-1"
                      title="Remove Player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Empty slots placeholders */}
            {Array.from({ length: Math.min(2, settings.maxPlayers - players.length) }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-slate-500 text-xs font-semibold select-none"
              >
                Open Seat #{players.length + i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Theme and Settings Section */}
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Table Felt Theme:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onThemeChange('emerald')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  theme === 'emerald'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Emerald Velvet</span>
              </button>

              <button
                onClick={() => onThemeChange('crimson')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  theme === 'crimson'
                    ? 'bg-red-700 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                <span>Royal Crimson</span>
              </button>

              <button
                onClick={() => onThemeChange('cyber')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  theme === 'cyber'
                    ? 'bg-cyan-700 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>Cyber Midnight</span>
              </button>
            </div>
          </div>

          {/* Host Room Settings Drawer Toggle */}
          {isHost && (
            <div className="mt-2.5 pt-2.5 border-t border-white/5">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{showSettings ? 'Hide Room Rule Settings' : 'Configure House Rules & Decks'}</span>
              </button>

              {showSettings && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/5 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Deck Scaling</label>
                    <select
                      value={settings.deckCount}
                      onChange={(e) =>
                        onUpdateSettings({ deckCount: Number(e.target.value) as 1 | 2 })
                      }
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white font-medium"
                    >
                      <option value={1}>1 Deck (52 Cards) — Best for 2-6 Players</option>
                      <option value={2}>2 Decks (104 Cards) — Recommended for 7-12 Players</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Turn Timer</label>
                    <select
                      value={settings.turnTimerSeconds}
                      onChange={(e) =>
                        onUpdateSettings({ turnTimerSeconds: Number(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white font-medium"
                    >
                      <option value={0}>No Timer (Casual Relaxed)</option>
                      <option value={15}>15 Seconds (Fast Blitz)</option>
                      <option value={30}>30 Seconds (Standard Competitive)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                    <span className="font-semibold text-slate-300">Equal Hands (Discard Leftovers)</span>
                    <input
                      type="checkbox"
                      checked={settings.equalHands}
                      onChange={(e) => onUpdateSettings({ equalHands: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                    <span className="font-semibold text-slate-300">4-Color Suit Accessibility</span>
                    <input
                      type="checkbox"
                      checked={settings.fourColorSuits}
                      onChange={(e) => onUpdateSettings({ fourColorSuits: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Launch Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
          <button
            onClick={onToggleReady}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition cursor-pointer ${
              localPlayer.isReady
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {localPlayer.isReady ? '✓ You Are Ready' : 'Mark Ready'}
          </button>

          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={`w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-wider shadow-2xl flex items-center justify-center gap-2 transition cursor-pointer ${
                canStart
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 scale-105 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Deal & Start Game!</span>
            </button>
          ) : (
            <div className="text-xs text-slate-400 italic">
              Waiting for host to start the deal...
            </div>
          )}
        </div>
      </div>

      {/* Rename Player Modal */}
      <RenamePlayerModal
        isOpen={!!renameTargetPlayer}
        player={renameTargetPlayer}
        isHost={isHost}
        allPlayers={players}
        onClose={() => setRenameTargetPlayer(null)}
        onRename={(playerId, newName) => {
          if (onRenamePlayer) {
            onRenamePlayer(playerId, newName);
          }
        }}
      />
    </div>
  );
};
