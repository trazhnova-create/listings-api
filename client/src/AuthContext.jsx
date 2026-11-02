import { createContext, useContext, useEffect, useState } from 'react';
import { loginRequest, registerRequest } from './api';

const AuthContext = createContext(null);


function loadStoredUser() {
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    return token && user ? user : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser);
  
  const [showAuth, setShowAuth] = useState(() => !loadStoredUser());
  const [sessionExpired, setSessionExpired] = useState(false);

  
  useEffect(() => {
    function handleExpired() {
      setUser(null);
      setSessionExpired(true);
      setShowAuth(true);
    }
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  async function login(email, password) {
    localStorage.removeItem('token'); 
    const data = await loginRequest(email, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setSessionExpired(false);
    setShowAuth(false);
  }

  async function register(email, password) {
    await registerRequest(email, password);
    await login(email, password); 
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  const value = {
    user,
    login,
    register,
    logout,
    showAuth,
    sessionExpired,
    openAuth: () => setShowAuth(true),
    closeAuth: () => {
      setShowAuth(false);
      setSessionExpired(false);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}