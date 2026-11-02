import './App.css';
import { AuthProvider, useAuth } from './AuthContext';
import ListingList from './components/ListingList';
import AuthModal from './components/AuthModal';

function Shell() {
  const { user, logout, openAuth } = useAuth();

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <span className="topbar__logo">Барахолка</span>
          <span className="topbar__tagline">вещи с историей — по-соседски</span>

          <div className="topbar__user">
            {user ? (
              <>
                <span className="topbar__email">
                  {user.email}
                  {user.role === 'admin' && <b className="role-badge">админ</b>}
                </span>
                <button onClick={logout}>Выйти</button>
              </>
            ) : (
              <button onClick={openAuth}>Войти</button>
            )}
          </div>
        </div>
        <div className="ornament" />
      </header>

      <main className="app">
        <ListingList />
      </main>

      <AuthModal />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

export default App;