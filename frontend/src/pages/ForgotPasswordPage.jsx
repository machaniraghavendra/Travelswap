import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestToken = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await api.forgotPassword({ email });
      setMessage(response.message || 'If this email exists, reset token has been generated.');
      setGeneratedToken(response.resetToken || '');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await api.resetPassword({ email, token, newPassword });
      setMessage('Password reset successful. You can sign in now.');
      setToken('');
      setNewPassword('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="tag">TravelSwap Access</p>
        <h1>Forgot Password</h1>
        <p className="auth-copy">Generate a reset token and set a new password.</p>

        <form onSubmit={requestToken} className="auth-form">
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Generating...' : 'Generate Reset Token'}</button>
        </form>

        {generatedToken && (
          <p className="auth-copy"><strong>Reset Token:</strong> {generatedToken}</p>
        )}

        <form onSubmit={resetPassword} className="auth-form">
          <label>
            Reset Token
            <input value={token} onChange={(event) => setToken(event.target.value)} required />
          </label>
          <label>
            New Password
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          <label>
            <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show Password
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Resetting...' : 'Reset Password'}</button>
        </form>

        {message && <div className="banner success">{message}</div>}
        {error && <div className="banner error">{error}</div>}

        <p className="auth-foot">
          Back to <Link to="/login">User Login</Link> or <Link to="/travel/login">Travel Login</Link>
        </p>
      </section>
    </div>
  );
}
