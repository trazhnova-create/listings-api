import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { getErrorMessage } from '../api';

function AuthModal() {
  const { showAuth, closeAuth, login, register, sessionExpired } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!showAuth) return null;

  const isLogin = mode === 'login';

  function switchMode() {
    setMode(isLogin ? 'register' : 'login');
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      setPassword('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={closeAuth}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="modal__title">{isLogin ? 'Вход' : 'Регистрация'}</h2>

        {sessionExpired && (
          <p className="modal__note">Сессия истекла. Войдите снова.</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <input
          type="password"
          placeholder={isLogin ? 'Пароль' : 'Пароль (не короче 6 символов)'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={isLogin ? undefined : 6}
        />

        {error && <p className="modal__error">{error}</p>}

        <button type="submit" className="modal__submit" disabled={submitting}>
          {submitting ? 'Подождите...' : isLogin ? 'Войти' : 'Создать аккаунт'}
        </button>

        <button type="button" className="modal__switch" onClick={switchMode}>
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  );
}

export default AuthModal;