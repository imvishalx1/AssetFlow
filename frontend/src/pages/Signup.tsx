import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
        const result = await client.post('/auth/signup', { name, email, password }) as { accessToken: string };
        tokenStore.set(result.accessToken);
        await refreshUser();
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data
        ?.error?.code;
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      setError(
        code === 'SELF_ELEVATION_DENIED'
          ? 'Self-elevation is not allowed. You can only register as Employee.'
          : message ?? 'Signup failed',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-split">
      <div className="auth-panel">
        <h1>AssetFlow</h1>
        <p className="value-prop">
          Join your organization's asset workspace. Accounts start as Employee — admins promote
          trusted members when needed.
        </p>
      </div>
      <div className="auth-form-col">
        <div className="auth-card">
          <h1>Create your account</h1>
          <form onSubmit={onSubmit}>
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={busy}>
              Sign up
            </button>
            <p className="note">New accounts start as Employee — admins can promote you later.</p>
          </form>
          <Link to="/login">Already have an account? Sign in</Link>
        </div>
      </div>
    </div>
  );
}
