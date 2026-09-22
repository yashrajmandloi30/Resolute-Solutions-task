import { useCallback, useEffect, useState } from 'react';
import LoginForm from './components/LoginForm';
import StudentForm from './components/StudentForm';
import Dashboard from './components/Dashboard';
import { TOKEN_KEY, USER_ID_KEY, setUnauthorizedHandler } from './api/http';
import { Student } from './types';

type AuthView = 'login' | 'register';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(USER_ID_KEY));
  const [view, setView] = useState<AuthView>('login');
  const [notice, setNotice] = useState('');

  const logout = useCallback((message = '') => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    setToken(null);
    setUserId(null);
    setView('login');
    setNotice(message);
  }, []);

  // Token expired / invalid -> back to login
  useEffect(() => {
    setUnauthorizedHandler(() => logout('Session expired. Please login again.'));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const handleLogin = (newToken: string, student: Student) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_ID_KEY, student.id);
    setToken(newToken);
    setUserId(student.id);
    setNotice('');
  };

  if (token) {
    return (
      <main className="container">
        <Dashboard userId={userId} onLogout={() => logout('You have been logged out.')} />
      </main>
    );
  }

  return (
    <main className="auth-page">
      {view === 'login' ? (
        <LoginForm
          notice={notice}
          onLoginSuccess={handleLogin}
          onSwitchToRegister={() => {
            setNotice('');
            setView('register');
          }}
        />
      ) : (
        <div className="auth-card wide">
          <h1>Student Registration</h1>
          <p className="muted">All details are encrypted in your browser before they are sent.</p>
          <StudentForm
            mode="create"
            onSuccess={(s) => {
              setNotice(`Registration successful, ${s.fullName}! Please login.`);
              setView('login');
            }}
          />
          <p className="switch">
            Already registered?{' '}
            <button type="button" className="link-btn" onClick={() => setView('login')}>
              Login
            </button>
          </p>
        </div>
      )}
    </main>
  );
}
