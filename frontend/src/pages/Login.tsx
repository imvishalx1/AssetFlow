import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>AssetFlow</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>Sign in</button>
      </form>
      <Link to="/signup">Need an account? Sign up</Link>
    </div>
  );
}
