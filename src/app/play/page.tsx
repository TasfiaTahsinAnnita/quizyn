'use client';

import { useState, useEffect } from 'react';
import { pusherClient } from '@/lib/pusher';
import { Triangle, Square, Circle, Hexagon } from 'lucide-react';
import './play.css';

export default function PlayerGame() {
  const [pin, setPin] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'WAITING' | 'PLAYING' | 'RESULT'>('WAITING');
  const [hasAnswered, setHasAnswered] = useState(false);

  useEffect(() => {
    const savedPin = localStorage.getItem('current_pin');
    const savedName = localStorage.getItem('nickname');
    
    if (savedPin) {
      setPin(savedPin);
      setNickname(savedName);
      
      if (!pusherClient) return;

      const channel = pusherClient.subscribe(`session-${savedPin}`);
      
      channel.bind('game-started', () => setGameState('PLAYING'));
      
      channel.bind('new-question', () => {
        setGameState('PLAYING');
        setHasAnswered(false);
      });

      // Polling fallback for game status if no Pusher
      const interval = setInterval(async () => {
        const res = await fetch(`/api/sessions/${savedPin}`);
        const data = await res.json();
        if (data.status === 'PLAYING' && gameState === 'WAITING') {
          setGameState('PLAYING');
        }
      }, 2000);

      // Handle tab closing
      const handleTabClose = () => {
        const body = JSON.stringify({ pin: savedPin, nickname: savedName });
        navigator.sendBeacon('/api/sessions/leave', body);
      };

      window.addEventListener('beforeunload', handleTabClose);

      return () => {
        window.removeEventListener('beforeunload', handleTabClose);
        pusherClient.unsubscribe(`session-${savedPin}`);
        clearInterval(interval);
      };
    }
  }, [gameState]);

  const handleAnswer = async (index: number) => {
    if (hasAnswered) return;
    
    setHasAnswered(true);
    setGameState('RESULT');

    await fetch('/api/sessions/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        pin, 
        nickname, 
        optionIndex: index,
        timeLeft: 10, // Placeholder: In a real app, we'd track timer on player side too
        totalTime: 20
      }),
    });
  };

  if (gameState === 'WAITING') {
    return (
      <div className="player_wait_screen">
        <h1 className="logo_mini">Quizyn!</h1>
        <div className="status_card">
          <h2 className="animate-pulse">You're in!</h2>
          <p>See your name on screen?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="player_game_container">
      {gameState === 'PLAYING' ? (
        <div className="player_shapes_grid">
          <button className="player_shape_btn red" onClick={() => handleAnswer(0)}>
            <Triangle size={80} fill="white" />
          </button>
          <button className="player_shape_btn blue" onClick={() => handleAnswer(1)}>
            <Square size={80} fill="white" />
          </button>
          <button className="player_shape_btn yellow" onClick={() => handleAnswer(2)}>
            <Circle size={80} fill="#333" />
          </button>
          <button className="player_shape_btn green" onClick={() => handleAnswer(3)}>
            <Hexagon size={80} fill="white" />
          </button>
        </div>
      ) : (
        <div className="player_wait_screen result_state">
          <h2 className="animate-bounce">Sent!</h2>
          <p>Check the host's screen for the results.</p>
        </div>
      )}
    </div>
  );
}
