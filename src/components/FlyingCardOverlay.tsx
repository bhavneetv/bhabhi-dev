import React, { useEffect } from 'react';
import type { Card, Theme } from '../types/game';
import { CardView } from './CardView';

export interface FlyingCardItem {
  id: string;
  card: Card;
  from: { left: number; top: number };
  to: { left: number; top: number };
  startRotation?: number;
  endRotation?: number;
  durationMs?: number;
  isThulla?: boolean;
  onComplete?: () => void;
}

interface FlyingCardOverlayProps {
  flyingCards: FlyingCardItem[];
  theme?: Theme;
  fourColorSuits?: boolean;
}

export const FlyingCardOverlay: React.FC<FlyingCardOverlayProps> = ({
  flyingCards,
  theme = 'emerald',
  fourColorSuits = false,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-visible">
      {flyingCards.map((item) => (
        <AnimatedCard
          key={item.id}
          item={item}
          theme={theme}
          fourColorSuits={fourColorSuits}
        />
      ))}
    </div>
  );
};

const AnimatedCard: React.FC<{
  item: FlyingCardItem;
  theme: Theme;
  fourColorSuits: boolean;
}> = ({ item, theme, fourColorSuits }) => {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const duration = item.durationMs || 850;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const startRot = item.startRotation ?? (item.isThulla ? 0 : Math.floor(Math.random() * 20 - 10));
    const endRot = item.endRotation ?? 0;
    const startScale = item.isThulla ? 1.25 : 1.08;
    const endScale = item.isThulla ? 1.05 : 0.95;

    // Direct browser compositor Web Animations API: 100% reliable 60/120fps motion
    const anim = el.animate(
      [
        {
          left: `${item.from.left}%`,
          top: `${item.from.top}%`,
          transform: `translate(-50%, -50%) rotate(${startRot}deg) scale(${startScale})`,
        },
        {
          left: `${item.to.left}%`,
          top: `${item.to.top}%`,
          transform: `translate(-50%, -50%) rotate(${endRot}deg) scale(${endScale})`,
        },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.18, 0.9, 0.32, 1)',
        fill: 'forwards',
      }
    );

    anim.onfinish = () => {
      item.onComplete?.();
    };

    return () => {
      try {
        anim.cancel();
      } catch {}
    };
  }, [item.id, duration]);

  return (
    <div
      ref={cardRef}
      className="absolute will-change-transform"
      style={{
        left: `${item.from.left}%`,
        top: `${item.from.top}%`,
        transform: `translate(-50%, -50%)`,
        zIndex: item.isThulla ? 80 : 60,
      }}
    >
      {/* Fiery rotating vortex aura around Thulla card as it travels from hand to table */}
      {item.isThulla && (
        <div className="absolute -inset-5 rounded-3xl bg-gradient-to-r from-red-600 via-amber-500 to-rose-600 opacity-90 blur-xl animate-vortex-spin pointer-events-none -z-10" />
      )}

      <div className="shadow-2xl">
        <CardView
          card={item.card}
          theme={theme}
          fourColorSuits={fourColorSuits}
          scale={item.isThulla ? 1.02 : 0.95}
          className={`shadow-2xl ${
            item.isThulla
              ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black shadow-[0_0_40px_rgba(239,68,68,1)]'
              : 'ring-2 ring-amber-400/80 shadow-[0_15px_30px_rgba(0,0,0,0.8)]'
          }`}
        />
      </div>
    </div>
  );
};
