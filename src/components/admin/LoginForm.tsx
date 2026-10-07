'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  return (
    <form
      className="login-form"
      onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
          });
          setPassword('');
          router.replace('/admin/dashboard');
          router.refresh();
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="wordmark">
        <span>✥</span>
        <strong>MANDAKINI</strong>
        <small>MANDAKINI STUDIO</small>
      </div>
      <h1>Welcome to Mandakini Studio.</h1>
      <p>Sign in to care for your collection.</p>
      {error && <p role="alert" className="notice error">{error}</p>}
      <label>
        Email
        <input
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </label>
      <button className="btn" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in securely'}
      </button>
      <p className="help">Admin access only. Customers do not need an account.</p>
    </form>
  );
}
