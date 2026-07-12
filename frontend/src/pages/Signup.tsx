import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../lib/api/client';
import { tokenStore } from '../auth/tokenStore';
import { useAuth } from '../auth/AuthProvider';
import { isMockMode } from '../auth/mock';

export function Signup() {
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isMockMode) {
        await login(email, password); // dummy Admin session
      } else {
        const { data } = await client.post('/auth/signup', { name, email, password });
        tokenStore.set(data.data.accessToken);
        await refreshUser();
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(code === 'SELF_ELEVATION_DENIED' ? 'Self-elevation is not allowed. You can only register as Employee.' : message ?? 'Signup failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>Create your account</h1>
      <form onSubmit={onSubmit}>
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>Sign up</button>
      </form>
      <a href="/login">Already have an account? Sign in</a>
    </div>
  );
}
