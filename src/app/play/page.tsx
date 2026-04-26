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
              const nextQ = unanswered[0];
              setCurrentQuestion((prevQ: any) => {
                if (prevQ?.id !== nextQ.id) {
                  setHasAnswered(false);
                }
                return nextQ;
              });
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
      
      const interval = setInterval(fetchSession, 3000);

      let channel: any;
      if (pusherClient) {
        channel = pusherClient.subscribe(`session-${savedPin}`);
        
        channel.bind('game-started', () => {
          setGameState('PLAYING');
          fetchSession();
        });
        
        channel.bind('new-question', () => {
          setGameState('PLAYING');
          setHasAnswered(false);
          fetchSession();
        });
      }

      // Handle tab closing
      const handleTabClose = () => {
        const body = JSON.stringify({ pin: savedPin, nickname: savedName });
        navigator.sendBeacon('/api/sessions/leave', body);
      };

      window.addEventListener('beforeunload', handleTabClose);

      return () => {
        window.removeEventListener('beforeunload', handleTabClose);
        if (channel) pusherClient.unsubscribe(`session-${savedPin}`);
        clearInterval(interval);
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
      <div className="player_status_overlay">
        <div className="status_content">
          <h1 className="logo_mini_display">Quizyn!</h1>
          <div className="waiting_card">
            <h2 className="animate-pulse">You're in!</h2>
            <p>See your name on the host's screen?</p>
          </div>
        </div>
        <div className="player_footer_tag">
          <span>Logged in as</span>
          <strong>{nickname}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="player_game_container">
      {gameState === 'PLAYING' && currentQuestion ? (
        <div className="player_quiz_view">
          <header className="player_view_header">
            <div className="quiz_meta">
              <span className="quiz_title_label">{session?.quiz?.title || 'Quizzy'}</span>
              <span className="question_progress">
                Question {session?.quiz?.questions?.findIndex((q: any) => q.id === currentQuestion.id) + 1} of {session?.quiz?.questions?.length}
              </span>
            </div>
          </header>

          <div className="question_info_main">
            <h3 className="player_question_text">{currentQuestion.text}</h3>
          </div>

          <div className="player_shapes_grid">
            {currentQuestion.options.map((opt: any, i: number) => {
              const icons = [<Triangle key="t" />, <Square key="s" />, <Circle key="c" />, <Hexagon key="h" />];
              const colors = ['red', 'blue', 'yellow', 'green'];
              return (
                <button 
                  key={opt.id} 
                  className={`player_shape_btn ${colors[i]} animate-pop-in`} 
                  style={{ animationDelay: `${i * 100}ms` }}
                  onClick={() => handleAnswer(i)}
                >
                  <div className="shape_icon_wrapper">{icons[i]}</div>
                  <span className="option_text_display">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="player_status_overlay">
          <div className="status_content">
            <div className="pulse_icon">⚡</div>
            <h2 className="status_title">{hasAnswered ? 'Answer Sent!' : 'Get Ready!'}</h2>
            <p className="status_subtitle">
              {hasAnswered 
                ? 'Wait for the host to reveal the results.' 
                : 'The next question will appear shortly.'}
            </p>
          </div>
          <div className="player_footer_tag">
            <span>Playing as</span>
            <strong>{nickname}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
