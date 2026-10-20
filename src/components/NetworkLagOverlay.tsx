import React, { useState } from 'react';
import { Wifi, WifiOff, AlertTriangle, RefreshCw, X } from 'lucide-react';

interface NetworkLagOverlayProps {
  ping: number;
  isOnline: boolean;
  onManualReconnect?: () => void;
}

export const NetworkLagOverlay: React.FC<NetworkLagOverlayProps> = ({
  ping,
  isOnline,
  onManualReconnect,
}) => {
  const [minimized, setMinimized] = useState(false);

  // Triggers when disconnected OR ping is abnormally high (> 280ms)
  const isHighPing = ping > 280;
  const shouldShow = (!isOnline || isHighPing) && !minimized;

  if (!shouldShow) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative max-w-sm w-full bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-2 border-amber-500/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center text-center">
        
        {/* Dismiss / Minimize button */}
        <button
          onClick={() => setMinimized(true)}
          className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          title="Minimize warning"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Big Animated Pulsing WiFi Icon in Center */}
        <div className="relative mb-4 mt-2">
          {/* Glowing Aura */}
          <div className="absolute -inset-4 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
          
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-600/30 via-yellow-500/20 to-amber-700/30 border-2 border-amber-400/60 flex items-center justify-center shadow-inner">
            {!isOnline ? (
              <WifiOff className="w-10 h-10 text-rose-500 animate-pulse" />
            ) : (
              <Wifi className="w-10 h-10 text-amber-400 animate-bounce" />
            )}
            
            {/* Warning alert badge */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-white tracking-wide uppercase">
          {!isOnline ? 'Connection Lost' : 'High Ping Detected'}
        </h3>

        {/* Ping Metrics Badge */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/30 text-xs font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-slate-300">Ping:</span>
          <span className={isOnline && ping < 350 ? 'text-amber-400' : 'text-rose-400 font-extrabold'}>
            {!isOnline ? 'Disconnected' : `${ping} ms`}
          </span>
        </div>

        {/* Sync Reassurance Message */}
        <p className="mt-3 text-xs text-slate-300 leading-relaxed max-w-[280px]">
          {!isOnline
            ? 'Attempting to reconnect with the authoritative server. Your cards and turn state are securely preserved.'
            : 'Unstable network connection. All card plays are synchronized through the server queue to prevent desync.'}
        </p>

        {/* Action Button */}
        {!isOnline && onManualReconnect && (
          <button
            onClick={onManualReconnect}
            className="mt-4 flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reconnect Now</span>
          </button>
        )}

        <div className="mt-3 text-[10px] text-slate-400">
          This warning will automatically vanish when your connection stabilizes.
        </div>
      </div>
    </div>
  );
};
