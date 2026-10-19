import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Player } from '../types/game';
import { X, Send, MessageSquare } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  messages: ChatMessage[];
  players: Player[];
  localPlayer: Player;
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  messages,
  players,
  localPlayer,
  onSendMessage,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const QUICK_PHRASES = [
    'Arre yaar! 🤦',
    'Wah bhai wah! 👏',
    'Thulla lag gaya! 💥',
    'Jaldi khelo! ⏱️',
    'Bach gaye! 😅',
    'Kya baat hai! 🔥',
  ];

  const QUICK_EMOJIS = ['😂', '🔥', '😡', '👏', '💀', '😈', '🎉'];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs sm:max-w-sm glass-panel border-l border-white/10 shadow-2xl flex flex-col animate-slide-left">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="font-extrabold text-white text-sm sm:text-base">Table Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages List (Player chat only, game logs removed) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {messages.filter((m) => !m.isSystem).length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8 italic">
            No chat messages yet. Tap an emoji or type below to chat!
          </div>
        ) : (
          messages
            .filter((m) => !m.isSystem)
            .map((msg) => {
              const isMe = msg.senderId === localPlayer.id;
              const sender = getPlayer(msg.senderId);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs">{sender?.avatar || '👤'}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-xs sm:text-sm max-w-[85%] break-words shadow ${
                      isMe
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-800 text-white border border-white/10 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emojis Row */}
      <div className="px-3 py-1.5 border-t border-white/5 bg-slate-950/40 flex items-center justify-between overflow-x-auto gap-1">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendMessage(emoji)}
            className="p-1.5 hover:scale-125 transition-transform text-base"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Hinglish Quick Phrases */}
      <div className="px-3 py-2 border-t border-white/5 bg-slate-950/60 flex flex-wrap gap-1.5">
        {QUICK_PHRASES.map((phrase) => (
          <button
            key={phrase}
            onClick={() => onSendMessage(phrase)}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] font-semibold text-slate-300 transition"
          >
            {phrase}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-slate-950/80 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message..."
          maxLength={120}
          className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition shadow"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
