'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import Link from 'next/link';
import './create.css';

interface Option {
  text: string;
  isCorrect: boolean;
}

interface Question {
  text: string;
  timer: number;
  points: number;
  options: Option[];
}

export default function CreateQuiz() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      text: '',
      timer: 20,
      points: 1000,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]
    }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, {
      text: '',
      timer: 20,
      points: 1000,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]
    }]);
  };

  const updateQuestionText = (index: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[index].text = text;
    setQuestions(newQuestions);
  };

  const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex].text = text;
    setQuestions(newQuestions);
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.forEach((opt, i) => {
      opt.isCorrect = i === oIndex;
    });
    setQuestions(newQuestions);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return alert('Please enter a quiz title');
    if (questions.some(q => !q.text.trim())) return alert('Please fill in all questions');
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, questions }),
      });

      const contentType = res.headers.get("content-type");
      if (res.ok) {
        alert('Quiz saved successfully!');
        window.location.href = '/dashboard';
      } else if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        console.error('Save failed with JSON:', data);
        alert('Error: ' + (data.error || 'Failed to save quiz') + (data.details ? ` (${data.details})` : ''));
      } else {
        const text = await res.text();
        console.error('Save failed with HTML/Text:', text);
        alert('Server Error: The database might not be set up. Please run "npx prisma db push".');
      }
    } catch (err) {
      console.error('Network error:', err);
      alert('Network error. Check if your MySQL is running.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="create_page_wrapper">
      <div className="create_container animate-fade-in">
        <header className="create_header">
          <h1>Create New Quiz</h1>
          <p>Define your questions and answers.</p>
        </header>

        <section className="basics_section">
          <div className="form_group">
            <label>Quiz Title</label>
            <input 
              type="text" 
              className="form_input" 
              placeholder="e.g., General Knowledge Trivia"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form_group">
            <label>Description (Optional)</label>
            <textarea 
              className="form_input" 
              placeholder="What is this quiz about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>

        <section className="questions_section">
          <h2>Questions</h2>
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="question_card">
              <div className="form_group">
                <label>Question {qIndex + 1}</label>
                <input 
                  type="text" 
                  className="form_input" 
                  placeholder="Enter your question"
                  value={q.text}
                  onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                />
              </div>

              <div className="options_grid">
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="option_item">
                    <input 
                      type="radio" 
                      name={`correct-${qIndex}`}
                      checked={opt.isCorrect}
                      onChange={() => setCorrectOption(qIndex, oIndex)}
                      className="correct_checkbox"
                    />
                    <input 
                      type="text" 
                      className="option_input" 
                      placeholder={`Option ${oIndex + 1}`}
                      value={opt.text}
                      onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="form_group" style={{ marginTop: '1rem' }}>
                <label>Timer (Seconds)</label>
                <select 
                  className="form_input" 
                  value={q.timer}
                  onChange={(e) => {
                    const newQuestions = [...questions];
                    newQuestions[qIndex].timer = parseInt(e.target.value);
                    setQuestions(newQuestions);
                  }}
                >
                  <option value={10}>10s</option>
                  <option value={20}>20s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                </select>
              </div>

              <div className="form_group" style={{ marginTop: '1rem' }}>
                <label>Points</label>
                <select 
                  className="form_input" 
                  value={q.points}
                  onChange={(e) => {
                    const newQuestions = [...questions];
                    newQuestions[qIndex].points = parseInt(e.target.value);
                    setQuestions(newQuestions);
                  }}
                >
                  <option value={0}>0 (No Points)</option>
                  <option value={1000}>1000 (Standard)</option>
                  <option value={2000}>2000 (Double Points)</option>
                </select>
              </div>
            </div>
          ))}

          <button className="add_question_btn" onClick={addQuestion}>
            + Add Another Question
          </button>
        </section>

        <footer className="footer_actions">
          <Link href="/dashboard">
            <Button variant="secondary" style={{ backgroundColor: '#ccc', borderBottomColor: '#aaa' }}>Cancel</Button>
          </Link>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Quiz'}
          </Button>
        </footer>
      </div>

      <style jsx>{`
        .create_page_wrapper {
          min-height: 100vh;
          background: #f0f2f5;
          padding: 2rem 0;
        }
      `}</style>
    </div>
  );
}
