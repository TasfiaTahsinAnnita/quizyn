'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/Button";
import "./dashboard.css";

interface Quiz {
  id: string;
  title: string;
  description: string;
  _count: { questions: number };
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/quizzes')
      .then(res => res.json())
      .then(data => {
        setQuizzes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleStartGame = async (quizId: string) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      });
      const data = await res.json();
      if (data.pin) {
        window.location.href = `/lobby/${data.pin}`;
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to start game.');
    }
  };

  return (
    <div className="dashboard_container">
      <header className="dashboard_header">
        <h1 className="logo_small">Quizyn!</h1>
        <div className="user_profile">
          <span>Welcome, Host</span>
          <Button variant="red">Logout</Button>
        </div>
      </header>

      <main className="dashboard_main">
        <div className="dashboard_actions">
          <h2>My Quizzes</h2>
          <Button variant="secondary" onClick={() => router.push('/dashboard/create')}>+ Create New Quiz</Button>
        </div>

        <div className="quiz_grid">
          {loading ? (
            <div className="empty_state"><p>Loading your quizzes...</p></div>
          ) : quizzes.length > 0 ? (
            quizzes.map(quiz => (
              <div key={quiz.id} className="quiz_card_item animate-fade-in">
                <h3>{quiz.title}</h3>
                <p>{quiz.description || 'No description'}</p>
                <div className="quiz_stats">
                  <span>{quiz._count.questions} Questions</span>
                  <Button variant="primary" onClick={() => handleStartGame(quiz.id)}>Play</Button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty_state">
              <p>You haven't created any quizzes yet.</p>
              <Button variant="primary" onClick={() => router.push('/dashboard/create')}>Create your first quiz</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
