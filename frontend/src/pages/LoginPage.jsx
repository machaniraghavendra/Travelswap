import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AuthCursorShell from '../components/AuthCursorShell';

export default function LoginPage({ accountType = 'USER' }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const initial = useMemo(() => (
    accountType === 'TRAVEL'
      ? { email: 'travel@travelswap.com', password: 'Travel123' }
      : { email: 'seller@travelswap.com', password: 'Seller123' }
  ), [accountType]);

  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const title = accountType === 'TRAVEL' ? 'Travel Operator Sign In' : 'User Sign In';
  const altLoginPath = accountType === 'TRAVEL' ? '/login' : '/travel/login';
  const registerPath = accountType === 'TRAVEL' ? '/travel/register' : '/register';

  const validate = () => {
    const nextErrors = {};
    if (!form.email.includes('@')) {
      nextErrors.email = 'Enter a valid email.';
    }
    if (!form.password || form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }
    return nextErrors;
  };

  const clearInvalid = (nextErrors) => {
    setForm((prev) => {
      const next = { ...prev };
      Object.keys(nextErrors).forEach((field) => {
        if (field !== '_form') {
          next[field] = '';
        }
      });
      return next;
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      clearInvalid(validationErrors);
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      await login(form.email, form.password, accountType);
      navigate('/dashboard');
    } catch (requestError) {
      const message = requestError.message || 'Unable to sign in.';
      const nextErrors = { password: message };
      setErrors(nextErrors);
      clearInvalid(nextErrors);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCursorShell>
      <section className="auth-card">
        <p className="tag">TravelSwap Access</p>
        <h1>{title}</h1>
        <p className="auth-copy">
          {accountType === 'TRAVEL'
            ? 'Use a TRAVEL account to manage buses and journey schedules.'
            : 'Use a USER account to book, buy, and sell tickets.'}
        </p>

        <form onSubmit={onSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            {errors.email && <small className="field-error">{errors.email}</small>}
          </label>

          <label>
            Password
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            {errors.password && <small className="field-error">{errors.password}</small>}
          </label>
          <label>
            <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show Password
          </label>

          <button type="submit" disabled={busy}>
            {busy ? (
              <span className="loading-inline">
                <span className="spinner spinner-sm" aria-hidden="true" />
                <span>Signing in...</span>
              </span>
            ) : 'Sign In'}
          </button>
          {errors._form && <small className="field-error">{errors._form}</small>}
        </form>

        <p className="auth-foot">
          Need {accountType === 'TRAVEL' ? 'travel operator' : 'user'} account? <Link to={registerPath}>Create account</Link>
        </p>
        <p className="auth-foot">
          Switch portal: <Link to={altLoginPath}>{accountType === 'TRAVEL' ? 'User Login' : 'Travel Login'}</Link>
        </p>
        <p className="auth-foot">
          Forgot password? <Link to="/forgot-password">Reset here</Link>
        </p>
      </section>
    </AuthCursorShell>
  );
}
