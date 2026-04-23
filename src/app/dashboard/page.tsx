'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/Button";
import Link from "next/link";
import "./dashboard.css";

interface Quiz {
  id: string;
  title: string;
  description: string;
  _count: { questions: number };
  createdAt: string;
}

export default function Dashboard() {
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
          <Link href="/dashboard/create">
            <Button variant="secondary">+ Create New Quiz</Button>
          </Link>
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
                  <Button variant="primary">Play</Button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty_state">
              <p>You haven't created any quizzes yet.</p>
              <Link href="/dashboard/create">
                <Button variant="primary">Create your first quiz</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
