'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/Button';
import Link from 'next/link';
import './auth.css';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await signIn('credentials', {
      redirect: false,
      email: formData.email,
      password: formData.password,
    });

    if (result?.ok) {
      window.location.href = '/dashboard';
    } else {
      alert('Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <div className="auth_container">
      <div className="auth_card animate-fade-in">
        <h1 className="logo_auth">Quizyn!</h1>
        <h2>Welcome Back, Host</h2>
        <form onSubmit={handleSubmit}>
          <div className="input_group">
            <label>Email</label>
            <input 
              type="email" 
              required 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="host@quizyn.com"
            />
          </div>
          <div className="input_group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••"
            />
          </div>
          <Button variant="secondary" className="auth_btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>
        <p className="auth_footer">
          Don't have an account? <Link href="/signup">Sign up for free</Link>
        </p>
      </div>
    </div>
  );
}
