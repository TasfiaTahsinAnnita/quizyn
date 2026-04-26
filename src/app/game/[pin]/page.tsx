'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { pusherClient } from '@/lib/pusher';
import { Button } from '@/components/Button';
import { Triangle, Square, Circle, Hexagon } from 'lucide-react';
import './game.css';

interface PlayerAnswer {
  nickname: string;
  optionIndex: number;
}

export default function HostGame() {
  const { pin } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameState, setGameState] = useState<'QUESTION' | 'RESULTS' | 'LEADERBOARD' | 'FINISHED'>('QUESTION');
  const [answers, setAnswers] = useState<number[]>([0, 0, 0, 0]);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [viewingQuestionIndex, setViewingQuestionIndex] = useState<number | null>(null);
  const currentQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (quiz?.questions[currentQuestionIndex]) {
      currentQuestionIdRef.current = quiz.questions[currentQuestionIndex].id;
    }
  }, [quiz, currentQuestionIndex]);
  
  // 1. Initial Fetch
  useEffect(() => {
    fetch(`/api/sessions/${pin}`)
      .then(res => res.json())
      .then(data => {
        setQuiz(data.quiz);
        setTimeLeft(data.quiz.questions[0].timer);
        if (data.responses) setAllResponses(data.responses);
      });
  }, [pin]);

  // 2. Pusher & Polling
  useEffect(() => {
    if (!pin) return;

    let channel: any;
    if (pusherClient) {
      channel = pusherClient.subscribe(`session-${pin}`);
      channel.bind('player-answer', (data: { optionIndex: number, questionId: string }) => {
        // Update both the current chart and the global responses list
        setAllResponses(prev => [...prev, { ...data, createdAt: new Date() }]);
        
        if (data.questionId && data.questionId === currentQuestionIdRef.current) {
          setAnswers(prevAnswers => {
            setTotalAnswers(prevTotal => prevTotal + 1);
            const newAnswers = [...prevAnswers];
            if (data.optionIndex >= 0 && data.optionIndex < 4) {
              newAnswers[data.optionIndex]++;
            }
            return newAnswers;
          });
        }
      });
    }

    return () => {
      if (channel) pusherClient.unsubscribe(`session-${pin}`);
    };
  }, [pin]);

  // 3. Polling for session data (backup)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${pin}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.responses) {
          setAllResponses(data.responses);
          
          // Also sync current answers count
          const currentQuestionId = quiz?.questions[currentQuestionIndex]?.id;
          const currentResponses = data.responses.filter((r: any) => r.questionId === currentQuestionId);
          if (currentResponses.length > totalAnswers) {
            const newAnswers = [0, 0, 0, 0];
            currentResponses.forEach((r: any) => {
              if (r.optionIdx >= 0 && r.optionIdx < 4) newAnswers[r.optionIdx]++;
            });
            setAnswers(newAnswers);
            setTotalAnswers(currentResponses.length);
          }
        }
      } catch (err) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [pin, currentQuestionIndex, quiz, totalAnswers]);

  const handleNext = async () => {
    if (currentQuestionIndex < (quiz?.questions?.length || 0) - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimeLeft(quiz.questions[nextIdx].timer);
      setGameState('QUESTION');
      setAnswers([0, 0, 0, 0]);
      setTotalAnswers(0);
      
      await fetch(`/api/sessions/${pin}/next`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIndex: nextIdx })
      });
    } else {
      setGameState('FINISHED');
    }
  };

  useEffect(() => {
    if (timeLeft > 0 && gameState === 'QUESTION') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'QUESTION') {
      // AUTO-PROGRESS to next question
      handleNext();
    }
  }, [timeLeft, gameState]);

  if (!quiz) return <div className="lobby_wrapper">Initializing Game Engine...</div>;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const shapes = [<Triangle key="1" />, <Square key="2" />, <Circle key="3" />, <Hexagon key="4" />];

  const getQuestionResults = (qIdx: number) => {
    const qId = quiz.questions[qIdx].id;
    const qResponses = allResponses.filter(r => (r.questionId || r.id) === qId || (r.questionId === qId));
    // Note: our local allResponses from Pusher might have different field names than DB
    const counts = [0, 0, 0, 0];
    qResponses.forEach(r => {
      const idx = r.optionIdx !== undefined ? r.optionIdx : r.optionIndex;
      if (idx >= 0 && idx < 4) counts[idx]++;
    });
    return { counts, total: qResponses.length };
  };

  return (
    <div className="game_container presenter_view">
      {/* Sidebar History */}
      <aside className="sidebar_history">
        <div className="sidebar_title">Question History</div>
        <div className="history_list">
          {quiz.questions.map((q: any, i: number) => (
            <div 
              key={q.id} 
              className={`history_item ${i === currentQuestionIndex ? 'current' : ''} ${i < currentQuestionIndex ? 'past' : ''}`}
              onClick={() => setViewingQuestionIndex(i)}
            >
              <span className="history_q_num">Q{i + 1} {i === currentQuestionIndex ? ' (Live)' : ''}</span>
              <span className="history_q_text">{q.text}</span>
            </div>
          ))}
        </div>
        <div className="sidebar_footer">
          <Button variant="outline" className="w-full" onClick={() => window.location.href = '/dashboard'}>End Game</Button>
        </div>
      </aside>

      <main className="main_game_area">
        <header className="game_header">
          <div className="game_info">
            <span className="pin_tag">PIN: {pin}</span>
            <span className="question_counter">Question {currentQuestionIndex + 1} / {quiz.questions.length}</span>
          </div>
          <div className="answer_counter">
            <strong>{totalAnswers}</strong>
            <span>Answers</span>
          </div>
        </header>

        <section className="game_main">
          {gameState === 'QUESTION' && (
            <div className="question_section">
              <h1 className="presenter_question_text animate-fade-in">{currentQuestion.text}</h1>
              <div className="timer_display">{timeLeft}</div>
            </div>
          )}

          {gameState === 'FINISHED' && (
            <div className="victory_screen animate-fade-in">
              <div className="crown_icon">👑</div>
              <h1>Game Complete!</h1>
              <Button variant="primary" onClick={() => window.location.href = '/dashboard'}>Back to Dashboard</Button>
            </div>
          )}
        </section>

        {gameState === 'QUESTION' && (
          <footer className="presenter_footer">
            {currentQuestion.options.map((opt: any, i: number) => (
              <div key={opt.id} className={`footer_option_item opt_${i} animate-pop-in`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="shape_icon">{shapes[i]}</div>
                <span>{opt.text}</span>
              </div>
            ))}
          </footer>
        )}

        {/* Results Modal */}
        {viewingQuestionIndex !== null && (
          <div className="results_modal_overlay" onClick={() => setViewingQuestionIndex(null)}>
            <div className="results_modal_content animate-pop-in" onClick={e => e.stopPropagation()}>
              <button className="close_modal" onClick={() => setViewingQuestionIndex(null)}>×</button>
              <h2 className="modal_q_text">Results for Q{viewingQuestionIndex + 1}</h2>
              <p className="modal_q_sub">{quiz.questions[viewingQuestionIndex].text}</p>
              
              <div className="results_chart_container">
                <div className="chart_bars">
                  {(() => {
                    const { counts, total } = getQuestionResults(viewingQuestionIndex);
                    return counts.map((count, i) => (
                      <div key={i} className="chart_column">
                        <div 
                          className={`chart_bar bar_${i}`} 
                          style={{ height: `${(count / (total || 1)) * 100 + 5}%` }}
                        >
                          <span className="count_label">{count}</span>
                        </div>
                        <div className="chart_shape">{shapes[i]}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
