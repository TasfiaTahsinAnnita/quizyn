import React from 'react';

interface AnimatedAvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export function AnimatedAvatar({ seed, size = 60, className = '' }: AnimatedAvatarProps) {
  // Generate pseudo-random values based on the seed (player nickname)
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Select shape: 0 = Square, 1 = Circle, 2 = Triangle
  const shapeType = hash % 3;
  
  // Select color: 0 = Red, 1 = Blue, 2 = Yellow, 3 = Green
  const colors = ['#e21b3c', '#1368ce', '#ffa602', '#26890c'];
  const color = colors[hash % colors.length];

  // Select face expression: 0 = Smile, 1 = Shocked, 2 = Cool
  const faceType = (hash * 3) % 3;

  return (
    <div 
      className={`animate-bounce-slow ${className}`} 
      style={{ 
        width: size, 
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background Shape */}
        {shapeType === 0 && <rect x="10" y="10" width="80" height="80" rx="15" fill={color} />}
        {shapeType === 1 && <circle cx="50" cy="50" r="45" fill={color} />}
        {shapeType === 2 && <path d="M50 10L95 85H5L50 10Z" fill={color} strokeLinejoin="round" />}

        {/* Eyes */}
        <circle cx="35" cy="45" r="5" fill="white" />
        <circle cx="65" cy="45" r="5" fill="white" />

        {/* Mouth */}
        {faceType === 0 && <path d="M 35 65 Q 50 80 65 65" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" />}
        {faceType === 1 && <circle cx="50" cy="70" r="8" fill="white" />}
        {faceType === 2 && <path d="M 35 65 L 65 65" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" />}
      </svg>
    </div>
  );
}
