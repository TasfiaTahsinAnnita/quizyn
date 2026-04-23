'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetch(`/api/sessions/${pin}`)
      .then(res => res.json())
      .then(data => {
        setQuiz(data.quiz);
        setTimeLeft(data.quiz.questions[0].timer);
      });

    if (pusherClient) {
      const channel = pusherClient.subscribe(`session-${pin}`);
      channel.bind('player-answer', (data: { optionIndex: number }) => {
        setAnswers(prev => {
          const newAnswers = [...prev];
          newAnswers[data.optionIndex]++;
          return newAnswers;
        });
        setTotalAnswers(prev => prev + 1);
      });
      return () => pusherClient.unsubscribe(`session-${pin}`);
    }
  }, [pin]);

  useEffect(() => {
    if (timeLeft > 0 && gameState === 'QUESTION') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'QUESTION') {
      setGameState('RESULTS');
    }
  }, [timeLeft, gameState]);

  if (!quiz) return <div className="lobby_wrapper">Initializing Game Engine...</div>;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const shapes = [<Triangle key="1" />, <Square key="2" />, <Circle key="3" />, <Hexagon key="4" />];

  const showLeaderboard = async () => {
    const res = await fetch(`/api/sessions/${pin}/leaderboard`);
    const data = await res.json();
    setLeaderboard(data.players || []);
    setGameState('LEADERBOARD');
  };

  const handleNext = async () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimeLeft(quiz.questions[nextIdx].timer);
      setGameState('QUESTION');
      setAnswers([0, 0, 0, 0]);
      setTotalAnswers(0);
      
      await fetch(`/api/sessions/${pin}/next`, { 
        method: 'POST',
        body: JSON.stringify({ questionIndex: nextIdx })
      });
    } else {
      setGameState('FINISHED');
    }
  };

  return (
    <div className="game_container presenter_view">
      <header className="game_header">
        <div className="game_info">
          <span className="pin_tag">PIN: {pin}</span>
          <span className="question_counter">Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
        </div>
        <div className="answer_counter">
          <strong>{totalAnswers}</strong> Answers
        </div>
      </header>

      <main className="game_main">
        {gameState === 'QUESTION' && (
          <div className="question_section">
            <h1 className="presenter_question_text">{currentQuestion.text}</h1>
            <div className="timer_display">{timeLeft}</div>
          </div>
        )}

        {gameState === 'RESULTS' && (
          <div className="results_chart_container animate-fade-in">
            <div className="chart_bars">
              {answers.map((count, i) => (
                <div key={i} className="chart_column">
                  <div 
                    className={`chart_bar bar_${i}`} 
                    style={{ height: `${(count / (totalAnswers || 1)) * 100 + 5}%` }}
                  >
                    <span className="count_label">{count}</span>
                  </div>
                  <div className="chart_shape">{shapes[i]}</div>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="next_btn" onClick={showLeaderboard}>
              Show Leaderboard
            </Button>
          </div>
        )}

        {gameState === 'LEADERBOARD' && (
          <div className="leaderboard_container animate-fade-in">
            <h1 className="leaderboard_title">Top Scorers</h1>
            <div className="leaderboard_list">
              {leaderboard.map((player, i) => (
                <div key={player.id} className="leaderboard_item">
                  <span className="rank">{i + 1}</span>
                  <span className="name">{player.nickname}</span>
                  <span className="score">{player.score} pts</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="next_btn" onClick={handleNext}>
              {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Final Results'}
            </Button>
          </div>
        )}

        {gameState === 'FINISHED' && (
          <div className="victory_screen animate-fade-in">
            <div className="crown_icon">👑</div>
            <h1>Game Complete!</h1>
            <Button variant="primary" onClick={() => window.location.href = '/dashboard'}>Back to Dashboard</Button>
          </div>
        )}
      </main>

      {gameState === 'QUESTION' && (
        <footer className="presenter_footer">
          {currentQuestion.options.map((opt: any, i: number) => (
            <div key={opt.id} className={`footer_option_item opt_${i}`}>
              <div className="shape_icon">{shapes[i]}</div>
              <span>{opt.text}</span>
            </div>
          ))}
        </footer>
      )}
    </div>
  );
}
