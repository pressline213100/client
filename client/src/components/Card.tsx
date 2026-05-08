'use client';
import { memo } from 'react';

// ─── Suit symbols ─────────────────────────────────────────────
const SUIT_SYMBOLS = {
  spades:   '♠',
  hearts:   '♥',
  diamonds: '♦',
  clubs:    '♣',
  joker:    '🃏',
};

const SUIT_COLORS = {
  spades:   '#fff',
  hearts:   '#ff4d6d',
  diamonds: '#ff4d6d',
  clubs:    '#fff',
  joker:    '#ffd700',
};

const RANK_DISPLAY = {
  small_joker: 'J',
  big_joker: 'JO',
};

interface CardProps {
  card: {
    id: string;
    suit: string;
    rank: string;
    isJoker: boolean;
    faceUp: boolean;
  };
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

const SIZES = {
  sm: { width: 52, height: 76, fontSize: 13, suitSize: 18 },
  md: { width: 72, height: 108, fontSize: 17, suitSize: 26 },
  lg: { width: 96, height: 140, fontSize: 22, suitSize: 34 },
};

export const CardComponent = memo(function CardComponent({
  card, selected = false, onClick, size = 'md', style = {}
}: CardProps) {
  const { width, height, fontSize, suitSize } = SIZES[size];
  const symbol = SUIT_SYMBOLS[card.suit] || '?';
  const color  = SUIT_COLORS[card.suit]  || '#fff';
  const rankStr = RANK_DISPLAY[card.rank] ?? card.rank;

  if (!card.faceUp) {
    return (
      <div
        onClick={onClick}
        style={{
          width, height,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          border: '1.5px solid rgba(255,255,255,0.15)',
          cursor: onClick ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
      >
        {/* Card back pattern */}
        <div style={{
          position: 'absolute', inset: 4,
          borderRadius: 7,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)',
        }} />
        <span style={{ fontSize: suitSize, opacity: 0.3 }}>🃏</span>
      </div>
    );
  }

  if (card.isJoker) {
    return (
      <div
        onClick={onClick}
        style={{
          width, height,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #11998e 100%)',
          border: selected ? '2px solid #ffd700' : '1.5px solid rgba(255,215,0,0.3)',
          cursor: onClick ? 'pointer' : 'default',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: selected ? '0 0 20px rgba(255,215,0,0.6), 0 4px 15px rgba(0,0,0,0.5)' : '0 4px 15px rgba(0,0,0,0.5)',
          transform: selected ? 'translateY(-12px)' : 'translateY(0)',
          transition: 'all 0.2s ease',
          position: 'relative',
          ...style,
        }}
      >
        <span style={{ fontSize: suitSize, lineHeight: 1 }}>🃏</span>
        <span style={{ fontSize: fontSize - 2, color: '#ffd700', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
          {rankStr}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        width, height,
        borderRadius: 10,
        background: selected
          ? 'linear-gradient(145deg, #1e1e3f, #252545)'
          : 'linear-gradient(145deg, #161628, #1e1e38)',
        border: selected ? `2px solid ${color}` : '1.5px solid rgba(255,255,255,0.12)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column',
        padding: '5px 5px',
        boxShadow: selected
          ? `0 0 18px ${color}66, 0 6px 20px rgba(0,0,0,0.6)`
          : '0 4px 15px rgba(0,0,0,0.5)',
        transform: selected ? 'translateY(-14px) scale(1.05)' : 'translateY(0) scale(1)',
        transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Shimmer overlay */}
      {selected && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 10,
          background: `linear-gradient(135deg, ${color}15 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Top-left rank + suit */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 1 }}>
        <span style={{ fontSize, fontWeight: 900, color, fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>
          {rankStr}
        </span>
        <span style={{ fontSize: fontSize - 3, color, lineHeight: 1 }}>{symbol}</span>
      </div>

      {/* Center suit */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: suitSize, color, textShadow: `0 0 10px ${color}55` }}>
          {symbol}
        </span>
      </div>

      {/* Bottom-right rank + suit (rotated) */}
      <div style={{
        display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 1,
        alignSelf: 'flex-end', transform: 'rotate(180deg)',
      }}>
        <span style={{ fontSize, fontWeight: 900, color, fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>
          {rankStr}
        </span>
        <span style={{ fontSize: fontSize - 3, color, lineHeight: 1 }}>{symbol}</span>
      </div>
    </div>
  );
});

// ─── Fan of face-down cards for opponents ─────────────────────
export function FanOfCards({ count, size = 'sm' }: { count: number; size?: 'sm' | 'md' }) {
  const { width, height } = SIZES[size];
  const maxVisible = Math.min(count, 8);
  const overlap = size === 'sm' ? 18 : 24;

  return (
    <div style={{
      display: 'flex', position: 'relative',
      width: maxVisible * overlap + width - overlap,
      height,
    }}>
      {Array.from({ length: maxVisible }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: i * overlap,
          zIndex: i,
        }}>
          <CardComponent
            card={{ id: `back_${i}`, suit: 'spades', rank: '2', isJoker: false, faceUp: false }}
            size={size}
          />
        </div>
      ))}
    </div>
  );
}
