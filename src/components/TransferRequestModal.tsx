import React from 'react';
import { Check, X, ShieldAlert, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export interface TransferRequestInfo {
  requestId: string;
  fromPlayerId: string;
  fromPlayerName: string;
  fromPlayerAvatar?: string;
  toPlayerId: string;
  toPlayerName: string;
  action: 'GIVE' | 'TAKE';
  cardCount: number;
}

interface TransferRequestModalProps {
  request: TransferRequestInfo | null;
  onAccept: (request: TransferRequestInfo) => void;
  onReject: (request: TransferRequestInfo) => void;
}

export const TransferRequestModal: React.FC<TransferRequestModalProps> = ({
  request,
  onAccept,
  onReject,
}) => {
  if (!request) return null;

  const isGive = request.action === 'GIVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl shadow-[0_0_35px_rgba(245,158,11,0.4)] p-5 text-white flex flex-col gap-4">
        {/* Animated Icon Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="relative w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center mb-2 shadow-inner">
            <span className="text-3xl">{request.fromPlayerAvatar || '👤'}</span>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
              {isGive ? (
                <ArrowDownLeft className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
              )}
            </div>
          </div>

          <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            {isGive ? 'Incoming Card Offer' : 'Request To Take Your Cards'}
          </span>

          <h3 className="text-lg font-black text-white mt-1">
            {request.fromPlayerName}
          </h3>

          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {isGive ? (
              <>
                wants to <strong className="text-amber-300 font-black">GIVE YOU</strong> all their{' '}
                <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-300 rounded font-black">
                  {request.cardCount} cards
                </span>
                .
              </>
            ) : (
              <>
                wants to <strong className="text-emerald-300 font-black">TAKE ALL</strong> your{' '}
                <span className="px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 rounded font-black">
                  {request.cardCount} cards
                </span>
                .
              </>
            )}
          </p>
        </div>

        {/* Impact Notice */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3 flex items-start gap-2.5 text-[11px] text-slate-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="leading-snug">
            {isGive ? (
              <>
                If accepted, <strong className="text-white">{request.fromPlayerName}</strong> sheds all
                their cards and becomes <strong className="text-emerald-400">SAFE</strong>. You will hold the extra cards.
              </>
            ) : (
              <>
                If accepted, all your cards will be transferred to{' '}
                <strong className="text-white">{request.fromPlayerName}</strong>, and you will become{' '}
                <strong className="text-emerald-400">SAFE</strong>!
              </>
            )}
          </p>
        </div>

        {/* Accept / Reject Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={() => onReject(request)}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-black text-xs uppercase tracking-wider rounded-2xl border border-white/10 transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Reject</span>
          </button>

          <button
            onClick={() => onAccept(request)}
            className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)]"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
