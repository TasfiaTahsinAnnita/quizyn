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
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const savedPin = localStorage.getItem('current_pin');
    const savedName = localStorage.getItem('nickname');
    
    if (savedPin) {
      setPin(savedPin);
      setNickname(savedName);
      
      const fetchSession = async () => {
        try {
          const res = await fetch(`/api/sessions/${savedPin}`, { cache: 'no-store' });
          const data = await res.json();
          
          if (data.error || !data.players) {
            console.error('Session error:', data.error);
            // If session is not found, clear storage and go back
            localStorage.removeItem('current_pin');
            window.location.href = '/';
            return;
          }

          setSession(data);
          
          // Find the current question based on responses
          const player = data.players.find((p: any) => p.nickname === savedName);
          if (player) {
            const answeredQuestionIds = (data.responses || [])
              .filter((r: any) => r.playerId === player.id)
              .map((r: any) => r.questionId);
            
            const unanswered = (data.quiz?.questions || []).filter(
              (q: any) => !answeredQuestionIds.includes(q.id)
            );
            
            if (unanswered.length > 0) {
              setCurrentQuestion(unanswered[0]);
              if (data.status === 'PLAYING') setGameState('PLAYING');
            } else {
              setGameState('RESULT');
              setHasAnswered(true);
            }
          }
        } catch (err) {
          console.error('Fetch session failed:', err);
        }
      };

      fetchSession();

      if (!pusherClient) {
        // Polling fallback
        const interval = setInterval(fetchSession, 3000);
        return () => clearInterval(interval);
      }

      const channel = pusherClient.subscribe(`session-${savedPin}`);
      
      channel.bind('game-started', () => {
        setGameState('PLAYING');
        fetchSession();
      });
      
      channel.bind('new-question', () => {
        setGameState('PLAYING');
        setHasAnswered(false);
        fetchSession();
      });

      // Handle tab closing
      const handleTabClose = () => {
        const body = JSON.stringify({ pin: savedPin, nickname: savedName });
        navigator.sendBeacon('/api/sessions/leave', body);
      };

      window.addEventListener('beforeunload', handleTabClose);

      return () => {
        window.removeEventListener('beforeunload', handleTabClose);
        pusherClient.unsubscribe(`session-${savedPin}`);
      };
    }
  }, [pin]);

  const handleAnswer = async (index: number) => {
    if (hasAnswered || !currentQuestion) return;
    
    setHasAnswered(true);
    setGameState('RESULT');

    await fetch('/api/sessions/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        pin, 
        nickname, 
        optionIndex: index,
        timeLeft: 10, 
        totalTime: currentQuestion.timer || 20
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
          <div className="player_info_tag">{nickname}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="player_game_container">
      {gameState === 'PLAYING' && currentQuestion ? (
        <div className="player_quiz_view">
          <div className="question_info">
            <h3>{currentQuestion.text}</h3>
          </div>
          <div className="player_shapes_grid">
            {currentQuestion.options.map((opt: any, i: number) => {
              const icons = [<Triangle key="t" />, <Square key="s" />, <Circle key="c" />, <Hexagon key="h" />];
              const colors = ['red', 'blue', 'yellow', 'green'];
              return (
                <button key={opt.id} className={`player_shape_btn ${colors[i]}`} onClick={() => handleAnswer(i)}>
                  <div className="shape_icon_small">{icons[i]}</div>
                  <span className="option_label">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="player_wait_screen result_state">
          <h2 className="animate-bounce">Sent!</h2>
          <p>Check the host's screen for the results.</p>
          <div className="player_info_tag">{nickname}</div>
        </div>
      )}
    </div>
  );
}
