import React, { useEffect, useState } from 'react';
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
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
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
  const [hasStarted, setHasStarted] = useState(false);
  const duration = item.durationMs || 350;

  useEffect(() => {
    // Trigger transition on next paint
    const raf = requestAnimationFrame(() => {
      setHasStarted(true);
    });

    const timer = setTimeout(() => {
      item.onComplete?.();
    }, duration);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [item, duration]);

  const currentLeft = hasStarted ? item.to.left : item.from.left;
  const currentTop = hasStarted ? item.to.top : item.from.top;
  const currentRot = hasStarted
    ? item.endRotation ?? 0
    : item.startRotation ?? (item.isThulla ? 0 : Math.random() * 20 - 10);
  const currentScale = item.isThulla
    ? hasStarted ? 1.05 : 1.25
    : hasStarted ? 0.95 : 1.1;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 will-change-transform"
      style={{
        left: `${currentLeft}%`,
        top: `${currentTop}%`,
        transform: `translate(-50%, -50%) rotate(${currentRot}deg) scale(${currentScale})`,
        transition: `left ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), top ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
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
