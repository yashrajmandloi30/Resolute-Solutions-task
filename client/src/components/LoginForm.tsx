import { ChangeEvent, FormEvent, useState } from 'react';
import { loginStudent } from '../api/studentApi';
import { getErrorMessage } from '../api/http';
import { FieldErrors, Student } from '../types';
import { LoginValues, validateLogin } from '../utils/validation';

interface Props {
  onLoginSuccess: (token: string, student: Student) => void;
  onSwitchToRegister: () => void;
  notice?: string;
}

export default function LoginForm({ onLoginSuccess, onSwitchToRegister, notice }: Props) {
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginValues>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = { ...values, [e.target.name]: e.target.value };
    setValues(next);
    if (submitted) setErrors(validateLogin(next));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');

    const validationErrors = validateLogin(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const { token, student } = await loginStudent(values.email.trim(), values.password);
      onLoginSuccess(token, student);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>Welcome back</h1>
      <p className="muted">Login to manage student records</p>

      {notice && <div className="alert success">{notice}</div>}
      {serverError && <div className="alert error">{serverError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={handleChange}
            className={errors.email ? 'invalid' : ''}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <div className="password-wrap">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={values.password}
              onChange={handleChange}
              className={errors.password ? 'invalid' : ''}
            />
            <button type="button" className="link-btn" onClick={() => setShowPassword((s) => !s)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <button type="submit" className="btn primary full" disabled={loading}>
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>

      <p className="switch">
        New student?{' '}
        <button type="button" className="link-btn" onClick={onSwitchToRegister}>
          Register here
        </button>
      </p>
    </div>
  );
}
