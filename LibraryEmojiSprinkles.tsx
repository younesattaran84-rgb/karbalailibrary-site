import React, { useState, useEffect } from 'react';

interface FloatingEmoji {
  id: number;
  emoji: string;
  left: number; // percentage (0 - 100)
  duration: number; // seconds
  delay: number; // seconds
  size: number; // px
  rotation: number;
}

export const LibraryEmojiSprinkles: React.FC = () => {
  const [ambientEmojis, setAmbientEmojis] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    // Increased count (18 emojis) and varied drift for richer, more active and noticeable movement
    const items: FloatingEmoji[] = [
      { id: 1, emoji: '📖', left: 4, duration: 15, delay: 0, size: 23, rotation: -14 },
      { id: 2, emoji: '✨', left: 12, duration: 18, delay: 2, size: 19, rotation: 18 },
      { id: 3, emoji: '📚', left: 20, duration: 16, delay: 6, size: 25, rotation: -10 },
      { id: 4, emoji: '🕊️', left: 28, duration: 20, delay: 1, size: 22, rotation: 22 },
      { id: 5, emoji: '📜', left: 37, duration: 17, delay: 4, size: 23, rotation: -16 },
      { id: 6, emoji: '⭐', left: 46, duration: 14, delay: 7, size: 20, rotation: 26 },
      { id: 7, emoji: '🔖', left: 54, duration: 19, delay: 1.8, size: 21, rotation: -12 },
      { id: 8, emoji: '💡', left: 63, duration: 16, delay: 5.5, size: 22, rotation: 15 },
      { id: 9, emoji: '📖', left: 72, duration: 15, delay: 3.2, size: 24, rotation: -20 },
      { id: 10, emoji: '✨', left: 81, duration: 21, delay: 8, size: 19, rotation: 12 },
      { id: 11, emoji: '📚', left: 89, duration: 16, delay: 2.8, size: 25, rotation: -15 },
      { id: 12, emoji: '🕊️', left: 96, duration: 17, delay: 9.5, size: 22, rotation: 18 },
      { id: 13, emoji: '🌿', left: 16, duration: 22, delay: 10, size: 20, rotation: -18 },
      { id: 14, emoji: '🏮', left: 33, duration: 18, delay: 12, size: 23, rotation: 14 },
      { id: 15, emoji: '💫', left: 60, duration: 15, delay: 11, size: 21, rotation: -24 },
      { id: 16, emoji: '📖', left: 78, duration: 17, delay: 13, size: 22, rotation: 16 },
      { id: 17, emoji: '⭐', left: 92, duration: 19, delay: 14, size: 20, rotation: -10 },
      { id: 18, emoji: '✨', left: 42, duration: 16, delay: 15, size: 20, rotation: 20 },
    ];
    setAmbientEmojis(items);
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-10 overflow-hidden"
      aria-hidden="true"
    >
      {ambientEmojis.map((item) => (
        <span
          key={item.id}
          style={{
            position: 'absolute',
            left: `${item.left}%`,
            bottom: '-40px',
            fontSize: `${item.size}px`,
            animation: `emojiFloatDrift ${item.duration}s ease-in-out infinite`,
            animationDelay: `${item.delay}s`,
            transform: `rotate(${item.rotation}deg)`,
            opacity: 0.55,
            filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))',
            userSelect: 'none',
          }}
          className="transition-opacity duration-500"
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
};

