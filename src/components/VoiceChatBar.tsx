import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio, AlertCircle } from 'lucide-react';
import { voiceService, type MicMode, type VoicePermissionState } from '../network/voiceService';

interface VoiceChatBarProps {
  voiceEnabled: boolean;
  localPlayerId?: string;
  roomCode?: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({
  voiceEnabled,
  localPlayerId,
  roomCode,
  onSpeakingChange,
}) => {
  const [micMode, setMicModeState] = useState<MicMode>(() => voiceService.getMicMode());
  const [isDeafened, setIsDeafenedState] = useState<boolean>(() => voiceService.getIsDeafened());
  const [isPttActive, setIsPttActiveState] = useState<boolean>(() => voiceService.getIsPttActive());
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<VoicePermissionState>(() =>
    voiceService.getPermissionState()
  );

  // Initialize voice session on mount / room change
  useEffect(() => {
    if (!voiceEnabled || !localPlayerId || !roomCode) return;

    voiceService.init(localPlayerId, roomCode);

    const unsubLevel = voiceService.onLevel((level, speaking) => {
      setAudioLevel(level);
      setIsSpeaking(speaking);
      onSpeakingChange?.(speaking);
    });

    const unsubPerm = voiceService.onPermission((state) => {
      setPermissionState(state);
    });

    return () => {
      unsubLevel();
      unsubPerm();
    };
  }, [voiceEnabled, localPlayerId, roomCode, onSpeakingChange]);

  // Push to talk with Spacebar
  useEffect(() => {
    if (micMode !== 'ptt') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        voiceService.setPttActive(true);
        setIsPttActiveState(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        voiceService.setPttActive(false);
        setIsPttActiveState(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [micMode]);

  const setMicMode = async (mode: MicMode) => {
    if (mode !== 'muted') {
      // User explicitly clicked to turn ON the microphone
      if (!voiceService.hasLocalStream()) {
        const granted = await voiceService.requestMicrophone();
        if (!granted) {
          setMicModeState('muted');
          voiceService.setMicMode('muted');
          return;
        }
      }
    }
    setMicModeState(mode);
    voiceService.setMicMode(mode);
  };

  const toggleDeafen = () => {
    const next = !isDeafened;
    setIsDeafenedState(next);
    voiceService.setDeafened(next);
  };

  const setPttActive = async (active: boolean) => {
    if (active && !voiceService.hasLocalStream()) {
      const granted = await voiceService.requestMicrophone();
      if (!granted) return;
    }
    setIsPttActiveState(active);
    voiceService.setPttActive(active);
  };

  const handleRequestMic = async () => {
    await voiceService.requestMicrophone();
  };

  if (!voiceEnabled) return null;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/80 border border-white/10 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full shadow-xl">
      {/* Voice Status Pill */}
      <div className="flex items-center gap-1 mr-0.5">
        <Radio
          className={`w-3.5 h-3.5 transition-colors ${
            isSpeaking
              ? 'text-emerald-400 animate-pulse'
              : micMode === 'muted'
              ? 'text-slate-500'
              : 'text-emerald-400/70'
          }`}
        />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 hidden md:inline">
          Live Voice
        </span>
      </div>

      {/* Permission alert ONLY when user actively attempts mic and it was blocked */}
      {micMode !== 'muted' && permissionState === 'denied' && (
        <button
          onClick={handleRequestMic}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold hover:bg-rose-500/30 transition animate-pulse"
          title="Microphone access blocked. Click to allow mic in browser."
        >
          <AlertCircle className="w-3 h-3 text-rose-400" />
          <span>Allow Mic</span>
        </button>
      )}

      {/* Mic mode toggles */}
      <div className="flex items-center bg-slate-900/90 rounded-full p-0.5 border border-white/10 shadow-inner">
        {/* MUTE BUTTON */}
        <button
          onClick={() => setMicMode('muted')}
          className={`px-2 py-1 rounded-full text-[10px] font-black transition cursor-pointer ${
            micMode === 'muted'
              ? 'bg-rose-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Mute Microphone"
        >
          <MicOff className="w-3 h-3" />
        </button>

        {/* PUSH TO TALK BUTTON */}
        <button
          onClick={() => setMicMode('ptt')}
          onMouseDown={() => setPttActive(true)}
          onMouseUp={() => setPttActive(false)}
          onTouchStart={() => setPttActive(true)}
          onTouchEnd={() => setPttActive(false)}
          className={`px-2 py-1 rounded-full text-[10px] font-black transition flex items-center gap-1 cursor-pointer select-none ${
            micMode === 'ptt'
              ? isPttActive
                ? 'bg-emerald-500 text-slate-950 shadow ring-2 ring-emerald-300 animate-pulse'
                : 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Push to talk: hold button or Spacebar to transmit live voice"
        >
          <span>PTT</span>
        </button>

        {/* OPEN MIC BUTTON */}
        <button
          onClick={() => setMicMode('open')}
          className={`px-2 py-1 rounded-full text-[10px] font-black transition cursor-pointer ${
            micMode === 'open'
              ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-400/50'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Open Mic: Always on with automatic voice detection"
        >
          <Mic className="w-3 h-3" />
        </button>
      </div>

      {/* Live Voice Audio Wave Equalizer (Dancing directly to real voice input!) */}
      {(micMode === 'open' || (micMode === 'ptt' && isPttActive)) && (
        <div
          className="flex items-end gap-0.5 h-3.5 w-7 px-0.5 transition-opacity"
          title={`Live Audio Level: ${audioLevel}%`}
        >
          <div
            className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(20, Math.min(100, audioLevel * 1.2))}%`,
              opacity: audioLevel > 10 ? 1 : 0.4,
            }}
          />
          <div
            className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(15, Math.min(100, audioLevel * 1.5))}%`,
              opacity: audioLevel > 10 ? 1 : 0.4,
            }}
          />
          <div
            className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(25, Math.min(100, audioLevel * 0.9))}%`,
              opacity: audioLevel > 10 ? 1 : 0.4,
            }}
          />
          <div
            className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(15, Math.min(100, audioLevel * 1.3))}%`,
              opacity: audioLevel > 10 ? 1 : 0.4,
            }}
          />
        </div>
      )}

      {/* Deafen Toggle Button */}
      <button
        onClick={toggleDeafen}
        className={`p-1 sm:p-1.5 rounded-full transition cursor-pointer ${
          isDeafened
            ? 'bg-rose-600 text-white shadow ring-2 ring-rose-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title={isDeafened ? 'Undeafen: Hear other players' : 'Deafen: Mute all incoming voices'}
      >
        {isDeafened ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
      </button>
    </div>
  );
};
