'use client';

import React, { useState, useEffect } from 'react';
import { pusherClient } from '@/lib/pusher';
import { Triangle, Square, Circle, Hexagon } from 'lucide-react';
import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import './play.css';

export default function PlayerGame() {
  const [pin, setPin] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'WAITING' | 'PLAYING' | 'RESULT' | 'FINISHED'>('WAITING');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const currentQuestionIdRef = React.useRef<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; pointsEarned: number } | null>(null);
  const [isRevealPhase, setIsRevealPhase] = useState(false);

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
          const player = data.players.find((p: any) => p.nickname === savedName);
          
          if (player && data.quiz?.questions) {
            // Synchronize player with the Host's current question
            const nextQ = data.quiz.questions[data.currentQuestionIndex || 0];
            
            if (nextQ) {
              if (currentQuestionIdRef.current !== nextQ.id) {
                // The Host moved to a new question! Reset player state.
                currentQuestionIdRef.current = nextQ.id;
                setCurrentQuestion(nextQ);
                setHasAnswered(false);
                setTimeLeft(nextQ.timer || 20);
                setAnswerResult(null);
                setIsRevealPhase(false);
              }
              
              if (data.status === 'PLAYING') setGameState('PLAYING');
              if (data.status === 'FINISHED') setGameState('FINISHED');
            } else {
              if (data.status === 'FINISHED') {
                setGameState('FINISHED');
              } else {
                setGameState('RESULT');
                setHasAnswered(true);
              }
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

  useEffect(() => {
    if (gameState !== 'WAITING' && currentQuestion && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState !== 'WAITING' && timeLeft === 0 && currentQuestion) {
      if (!isRevealPhase) {
        setIsRevealPhase(true);
        setGameState('RESULT');
        
        if (!hasAnswered) {
          setHasAnswered(true);
          // Submit a timeout answer to backend
          fetch('/api/sessions/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              pin, 
              nickname, 
              optionIndex: -1,
              timeLeft: 0, 
              totalTime: currentQuestion.timer || 20
            }),
          })
          .then(res => res.json())
          .then(data => setAnswerResult({ isCorrect: false, pointsEarned: 0 }))
          .catch(console.error);
        }
      }
    }
  }, [timeLeft, currentQuestion, hasAnswered, pin, nickname, isRevealPhase, gameState]);

  const handleAnswer = async (index: number) => {
    if (hasAnswered || !currentQuestion) return;
    
    setHasAnswered(true);
    setGameState('RESULT');

    const response = await fetch('/api/sessions/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        pin, 
        nickname, 
        optionIndex: index,
        timeLeft: timeLeft, 
        totalTime: currentQuestion.timer || 20
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      setAnswerResult({ isCorrect: data.isCorrect, pointsEarned: data.pointsEarned });
    }
  };

  if (gameState === 'WAITING') {
    return (
      <div className="player_status_overlay">
        <div className="status_content" style={{ padding: '2rem' }}>
          <h1 className="logo_mini_display">Quizyn!</h1>
          <div className="waiting_card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <AnimatedAvatar seed={nickname || 'Player'} size={100} className="animate-pop-in" />
            <h2 className="animate-pulse" style={{ marginTop: '1rem' }}>You're in!</h2>
            <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>See your name on the host's screen?</p>
            
            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', width: '100%' }}>
              <h3 style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '0.5rem' }}>Players Joined: {session?.players?.length || 1}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                {session?.players?.slice(-10).map((p: any, i: number) => (
                  <div key={p.id} className="animate-pop-in" style={{ animationDelay: `${i * 100}ms` }} title={p.nickname}>
                    <AnimatedAvatar seed={p.nickname} size={40} />
                  </div>
                ))}
              </div>
            </div>
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
      {gameState === 'PLAYING' && currentQuestion && !hasAnswered ? (
        <div className="player_quiz_view" style={{ height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
          <div className="player_shapes_grid" style={{ height: '100vh', width: '100%', margin: 0, padding: '0.5rem', gap: '0.5rem' }}>
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
                  <div className="shape_icon_wrapper" style={{ transform: 'scale(3)' }}>{icons[i]}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : isRevealPhase ? (
        <div className={`player_reveal_screen ${answerResult?.isCorrect ? 'correct' : 'incorrect'} animate-pop-in`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: 'white', background: answerResult?.isCorrect ? '#4ade80' : '#ef4444' }}>
          <div className="reveal_icon" style={{ fontSize: '6rem', marginBottom: '1rem' }}>
            {answerResult?.isCorrect ? '✔' : '✖'}
          </div>
          <h1 className="reveal_title" style={{ fontSize: '4rem', fontWeight: 900, marginBottom: '2rem' }}>
            {answerResult?.isCorrect ? 'Correct!' : 'Incorrect!'}
          </h1>
          
          <div className="reveal_points_pill" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem 3rem', borderRadius: '999px', fontSize: '2rem', fontWeight: 'bold' }}>
            {answerResult?.isCorrect ? `+ ${answerResult.pointsEarned}` : '0'} Points
          </div>
          <p style={{ marginTop: '2rem', fontSize: '1.2rem', opacity: 0.8 }}>Waiting for host...</p>
        </div>
      ) : gameState === 'FINISHED' ? (
        <div className="player_reveal_screen animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: 'white', background: 'var(--primary)' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '2rem' }}>Quiz Finished!</h1>
          
          <div className="podium_place place_1 animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <AnimatedAvatar seed={nickname || 'Player'} size={120} />
            <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.2)', padding: '1rem 3rem', borderRadius: '12px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Final Score</h2>
              <strong style={{ fontSize: '3rem' }}>
                {session?.players?.find((p: any) => p.nickname === nickname)?.score || 0}
              </strong>
            </div>
          </div>
          
          <p style={{ opacity: 0.8, fontSize: '1.2rem' }}>Look at the host's screen for the podium!</p>
          <button 
            style={{ marginTop: '2rem', padding: '1rem 2rem', borderRadius: '30px', background: 'white', color: 'var(--primary)', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            onClick={() => window.location.href = '/'}
          >
            Play Again
          </button>
        </div>
      ) : (
        <div className="player_status_overlay">
          <div className="status_content">
            <div className="pulse_icon">⚡</div>
            <h2 className="status_title">Answer Sent!</h2>
            <p className="status_subtitle">Wait for the timer to run out...</p>
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
