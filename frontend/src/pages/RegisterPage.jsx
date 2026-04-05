import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AuthCursorShell from '../components/AuthCursorShell';

export default function RegisterPage({ accountType = 'USER' }) {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    travelCode: '',
    travelName: ''
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const isTravel = accountType === 'TRAVEL';
  const loginPath = isTravel ? '/travel/login' : '/login';
  const altRegisterPath = isTravel ? '/register' : '/travel/register';

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }
    if (!form.email.includes('@')) {
      nextErrors.email = 'Enter a valid email.';
    }
    if (!form.phone.trim() || form.phone.trim().length < 8) {
      nextErrors.phone = 'Phone number must be at least 8 characters.';
    }
    if (!form.password || form.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }
    if (isTravel) {
      if (!form.travelCode.trim() || form.travelCode.trim().length < 2) {
        nextErrors.travelCode = 'Travel code must be at least 2 characters.';
      }
      if (!form.travelName.trim() || form.travelName.trim().length < 3) {
        nextErrors.travelName = 'Travel name must be at least 3 characters.';
      }
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
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        travelCode: isTravel ? form.travelCode.trim().toUpperCase() : null,
        travelName: isTravel ? form.travelName.trim() : null
      }, accountType);
      navigate('/dashboard');
    } catch (requestError) {
      const message = requestError.message || 'Unable to create account.';
      const lower = message.toLowerCase();
      const field = lower.includes('email')
        ? 'email'
        : lower.includes('code')
          ? 'travelCode'
          : lower.includes('travel')
            ? 'travelName'
            : '_form';
      const nextErrors = { [field]: message };
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
        <h1>{isTravel ? 'Travel Operator Sign Up' : 'User Sign Up'}</h1>
        <p className="auth-copy">
          {isTravel
            ? 'TRAVEL accounts can manage buses and journey schedules.'
            : 'USER accounts can book seats, purchase resale, and sell owned tickets.'}
        </p>

        <form onSubmit={onSubmit} className="auth-form">
          <label>
            Full Name
            <input name="fullName" value={form.fullName} onChange={onChange} />
            {errors.fullName && <small className="field-error">{errors.fullName}</small>}
          </label>

          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={onChange} />
            {errors.email && <small className="field-error">{errors.email}</small>}
          </label>

          <label>
            Phone
            <input name="phone" value={form.phone} onChange={onChange} />
            {errors.phone && <small className="field-error">{errors.phone}</small>}
          </label>

          <label>
            Password
            <input type={showPassword ? 'text' : 'password'} name="password" minLength={8} value={form.password} onChange={onChange} />
            {errors.password && <small className="field-error">{errors.password}</small>}
          </label>
          <label>
            <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show Password
          </label>

          {isTravel && (
            <>
              <label>
                Travel Name
                <input name="travelName" value={form.travelName} onChange={onChange} />
                {errors.travelName && <small className="field-error">{errors.travelName}</small>}
              </label>
              <label>
                Travel Code
                <input name="travelCode" value={form.travelCode} onChange={onChange} />
                {errors.travelCode && <small className="field-error">{errors.travelCode}</small>}
              </label>
            </>
          )}

          <button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create Account'}</button>
          {errors._form && <small className="field-error">{errors._form}</small>}
        </form>

        <p className="auth-foot">
          Already registered? <Link to={loginPath}>Sign in</Link>
        </p>
        <p className="auth-foot">
          Switch sign up: <Link to={altRegisterPath}>{isTravel ? 'User Sign Up' : 'Travel Sign Up'}</Link>
        </p>
      </section>
    </AuthCursorShell>
  );
}
