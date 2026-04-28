'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { pusherClient } from '@/lib/pusher';
import { Button } from '@/components/Button';
import { AnimatedAvatar } from '@/components/AnimatedAvatar';
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
  const [showBars, setShowBars] = useState(false);
  const currentQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (gameState === 'RESULTS') {
      const t = setTimeout(() => setShowBars(true), 100);
      return () => clearTimeout(t);
    } else {
      setShowBars(false);
    }
  }, [gameState]);

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
          setTotalAnswers(prevTotal => prevTotal + 1);
          setAnswers(prevAnswers => {
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
    }, gameState === 'QUESTION' ? 1000 : 3000);
    return () => clearInterval(interval);
  }, [pin, currentQuestionIndex, quiz, totalAnswers, gameState]);

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
      
      await fetch(`/api/sessions/${pin}/next`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINISHED' })
      });

      fetch(`/api/sessions/${pin}/leaderboard`)
        .then(res => res.json())
        .then(data => setLeaderboard(data.players || []));
    }
  };

  useEffect(() => {
    if (timeLeft > 0 && gameState === 'QUESTION') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'QUESTION') {
      // Transition to RESULTS screen to show the animated bar chart
      setGameState('RESULTS');
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
              <div className="timer_display_wrapper">
                <div className="timer_display">{timeLeft}</div>
              </div>
            </div>
          )}

          {gameState === 'RESULTS' && (
            <div className="results_section animate-fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 className="presenter_question_text" style={{ marginBottom: '1rem' }}>{currentQuestion.text}</h1>
              <div className="results_chart_container" style={{ width: '100%', maxWidth: '800px', margin: '2rem 0' }}>
                <div className="chart_bars">
                  {answers.map((count, i) => {
                    const isCorrect = currentQuestion.options[i]?.isCorrect;
                    return (
                      <div key={i} className={`chart_column ${isCorrect ? 'correct_ans' : 'wrong_ans'}`} style={{ opacity: isCorrect ? 1 : 0.5 }}>
                        <div 
                          className={`chart_bar bar_${i}`} 
                          style={{ 
                            height: `${showBars ? (totalAnswers > 0 ? (count / totalAnswers) * 100 + 5 : 5) : 5}%`,
                            transition: 'height 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                          }}
                        >
                          <span className="count_label">{count}</span>
                        </div>
                        <div className="chart_shape">{shapes[i]}</div>
                        {isCorrect && <div style={{ color: '#4ade80', fontSize: '2rem', marginTop: '0.5rem' }}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <Button variant="primary" size="lg" onClick={handleNext} style={{ marginTop: '2rem', fontSize: '1.5rem', padding: '1rem 3rem' }}>
                Next Question
              </Button>
            </div>
          )}

          {gameState === 'FINISHED' && (
            <div className="victory_screen animate-fade-in" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '5rem' }}>
              <h1 className="presenter_question_text" style={{ marginBottom: 'auto', marginTop: '2rem' }}>Podium</h1>
              
              <div className="podium_container" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '1rem', height: '400px' }}>
                {/* 2nd Place */}
                {leaderboard[1] && (
                  <div className="podium_place place_2 animate-slide-up" style={{ animationDelay: '0.5s' }}>
                    <AnimatedAvatar seed={leaderboard[1].nickname} size={80} />
                    <div className="podium_pillar" style={{ height: '150px', background: 'var(--blue)', width: '140px', borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '1rem', color: 'white' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 900 }}>2</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{leaderboard[1].nickname}</span>
                      <span style={{ fontSize: '1rem', opacity: 0.8 }}>{leaderboard[1].score}</span>
                    </div>
                  </div>
                )}
                
                {/* 1st Place */}
                {leaderboard[0] && (
                  <div className="podium_place place_1 animate-slide-up" style={{ animationDelay: '1.5s', zIndex: 10 }}>
                    <div className="crown" style={{ fontSize: '3rem', marginBottom: '-10px', animation: 'bounceSlow 2s infinite' }}>👑</div>
                    <AnimatedAvatar seed={leaderboard[0].nickname} size={100} />
                    <div className="podium_pillar" style={{ height: '250px', background: 'var(--yellow)', width: '160px', borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '1rem', color: 'black' }}>
                      <span style={{ fontSize: '3rem', fontWeight: 900 }}>1</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{leaderboard[0].nickname}</span>
                      <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>{leaderboard[0].score}</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboard[2] && (
                  <div className="podium_place place_3 animate-slide-up" style={{ animationDelay: '1s' }}>
                    <AnimatedAvatar seed={leaderboard[2].nickname} size={80} />
                    <div className="podium_pillar" style={{ height: '100px', background: 'var(--green)', width: '140px', borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '1rem', color: 'white' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 900 }}>3</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{leaderboard[2].nickname}</span>
                      <span style={{ fontSize: '1rem', opacity: 0.8 }}>{leaderboard[2].score}</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '3rem' }}>
                <Button variant="primary" size="lg" onClick={() => window.location.href = '/dashboard'}>Return to Dashboard</Button>
              </div>
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
