import React, { useState } from 'react';
import {
  Crown,
  Users,
  Play,
  HelpCircle,
  ArrowRight,
  Bot,
  User,
} from 'lucide-react';

interface HomeScreenProps {
  playerName: string;
  playerAvatar: string;
  onUpdateProfile: (name: string, avatar: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  onSoloPractice: () => void;
  onOpenRules: () => void;
}

const AVATARS = ['😎', '🤠', '🥷', '👑', '🦁', '🦊', '🐯', '🐼', '🤖', '👾', '🚀', '🃏'];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  playerName,
  playerAvatar,
  onUpdateProfile,
  onCreateRoom,
  onJoinRoom,
  onSoloPractice,
  onOpenRules,
}) => {
  const [nameInput, setNameInput] = useState(playerName);
  const [selectedAvatar, setSelectedAvatar] = useState(playerAvatar);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameInput(val);
    onUpdateProfile(val || 'Player', selectedAvatar);
  };

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
    onUpdateProfile(nameInput || 'Player', avatar);
  };

  const handleCreate = () => {
    const validName = nameInput.trim() || 'Player (Host)';
    onUpdateProfile(validName, selectedAvatar);
    onCreateRoom();
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setErrorMsg('Please enter a valid room code (e.g., 6 characters)');
      return;
    }
    setErrorMsg(null);
    const validName = nameInput.trim() || 'Player';
    onUpdateProfile(validName, selectedAvatar);
    onJoinRoom(clean);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/30 via-slate-950 to-black pointer-events-none" />

      {/* Main Container */}
      <div className="glass-panel rounded-3xl max-w-lg w-full p-5 sm:p-8 border border-white/10 shadow-2xl relative z-10 flex flex-col gap-5 my-auto">
        {/* Title Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 p-0.5 shadow-2xl mb-3 flex items-center justify-center animate-bounce-slow">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-3xl font-serif text-amber-400">
              ♠
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              Bhabhi Dever
            </h1>
            <span className="text-[10px] sm:text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-black">
              THULLA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time Multiplayer Online • Play with friends anywhere
          </p>
        </div>

        {/* Player Profile Card */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>Enter Your Name & Choose Avatar</span>
          </label>

          {/* Name Input with Avatar Preview */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border-2 border-amber-400/60 flex items-center justify-center text-2xl flex-shrink-0 shadow">
              {selectedAvatar}
            </div>
            <input
              type="text"
              value={nameInput}
              onChange={handleNameChange}
              maxLength={20}
              placeholder="Enter your name..."
              className="w-full bg-slate-950 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm font-black text-white focus:outline-none focus:border-amber-400 shadow-inner"
            />
          </div>

          {/* Avatar Selector Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {AVATARS.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => handleAvatarSelect(av)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg transition flex-shrink-0 cursor-pointer ${
                  selectedAvatar === av
                    ? 'bg-amber-500 text-slate-950 scale-110 shadow-lg ring-2 ring-white'
                    : 'bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-white'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Buttons: CREATE or JOIN */}
        <div className="flex flex-col gap-3">
          {/* 1. CREATE ROOM BUTTON */}
          <button
            onClick={handleCreate}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-between group transition cursor-pointer scale-[1.01] hover:scale-105 active:scale-98 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-950/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-slate-950" />
              </div>
              <div className="flex flex-col text-left">
                <span className="leading-tight">Create Room (Host)</span>
                <span className="text-[10px] opacity-80 font-bold lowercase">
                  start room & invite friends with room code
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </button>

          {/* 2. JOIN ROOM BUTTON */}
          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white border border-amber-400/40 hover:border-amber-400 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-between group transition cursor-pointer hover:scale-102 active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="leading-tight text-amber-300">Join Friend&apos;s Room</span>
                  <span className="text-[10px] text-slate-400 font-bold lowercase">
                    enter friend&apos;s room code to play together
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition" />
            </button>
          ) : (
            <form onSubmit={handleJoinSubmit} className="bg-slate-900/90 border-2 border-amber-400 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  Enter Room Code:
                </label>
                <button
                  type="button"
                  onClick={() => setShowJoinInput(false)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 6D8X2P"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-white/20 rounded-xl px-3 py-2 text-base font-mono font-black text-amber-300 uppercase tracking-widest focus:outline-none focus:border-amber-400"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!joinCodeInput.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-lg"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Join</span>
                </button>
              </div>

              {errorMsg && (
                <span className="text-[10px] text-rose-400 font-bold">{errorMsg}</span>
              )}
            </form>
          )}
        </div>

        {/* Secondary Options: Practice Solo vs Bots + Rules */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
          <button
            onClick={onSoloPractice}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Practice Solo vs Bots</span>
          </button>

          <button
            onClick={onOpenRules}
            className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Rules</span>
          </button>
        </div>
      </div>
    </div>
  );
};
