'use client';

import { useState } from 'react';
import Link from "next/link";
import { Button } from "@/components/Button";
import "./page.css";

export default function Home() {
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (!pin || !nickname) return alert('Enter PIN and Nickname');
    
    setIsJoining(true);
    try {
      const res = await fetch('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, nickname }),
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('current_pin', pin);
        localStorage.setItem('nickname', nickname);
        window.location.href = '/play';
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to join.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="main_container">
      <div className="hero_section animate-fade-in">
        <h1 className="logo_text">Quizyn!</h1>
        <p className="subtitle">Real-time fun, simplified.</p>
        
        <div className="action_cards">
          <div className="card host_card">
            <h2>Host a Game</h2>
            <p>Create quizzes and challenge your friends.</p>
            <Link href="/dashboard" style={{ width: '100%' }}>
              <Button variant="primary" fullWidth>Get Started</Button>
            </Link>
          </div>
          
          <div className="card player_card">
            <h2>Join a Game</h2>
            <p>Enter a PIN and nickname to play.</p>
            <div className="input_group">
              <input 
                type="text" 
                placeholder="Game PIN" 
                className="pin_input" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Nickname" 
                className="pin_input" 
                style={{ fontSize: '1rem', letterSpacing: 'normal' }}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining ? 'Joining...' : 'Join Game'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
