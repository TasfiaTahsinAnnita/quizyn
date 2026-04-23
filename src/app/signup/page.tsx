'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import Link from 'next/link';
import './auth.css';

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      window.location.href = '/login';
    } else {
      const data = await res.json();
      alert(data.error || 'Signup failed');
      setLoading(false);
    }
  };

  return (
    <div className="auth_container">
      <div className="auth_card animate-fade-in">
        <h1 className="logo_auth">Quizyn!</h1>
        <h2>Create your Host account</h2>
        <form onSubmit={handleSubmit}>
          <div className="input_group">
            <label>Name</label>
            <input 
              type="text" 
              required 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Your full name"
            />
          </div>
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
              placeholder="Min 6 characters"
            />
          </div>
          <Button variant="primary" className="auth_btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>
        <p className="auth_footer">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
