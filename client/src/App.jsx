import './App.css';
import { AuthProvider, useAuth } from './AuthContext';
import ListingList from './components/ListingList';
import AuthModal from './components/AuthModal';

function Shell() {
  const { user, logout, openAuth } = useAuth();

  return (
    <>
      {}
      <div className="page-decoration page-decoration--left" />
      <div className="page-decoration page-decoration--right" />

      {}
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
        <div className="ornament-border" />
      </header>

      {}
      <section className="hero">
        <div className="hero__ornament">
          <svg width="100%" height="100%" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <defs>
              <pattern id="heroPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M30 5L55 30L30 55L5 30Z" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
                <path d="M30 15L45 30L30 45L15 30Z" fill="rgba(255,255,255,0.08)"/>
                <circle cx="30" cy="30" r="3" fill="rgba(255,255,255,0.12)"/>
                <path d="M0 0h6v6H0zM54 0h6v6h-6zM0 54h6v6H0zM54 54h6v6h-6z" fill="rgba(255,255,255,0.1)"/>
              </pattern>
            </defs>
            <rect width="1200" height="120" fill="url(#heroPattern)"/>
          </svg>
        </div>
        {}
        <div className="hero__big-ornament">
          <svg width="300" height="300" viewBox="0 0 300 300" style={{position: 'absolute', right: '-50px', top: '50%', transform: 'translateY(-50%)', opacity: 0.06}}>
            <path d="M150 10L290 150L150 290L10 150Z" fill="none" stroke="white" strokeWidth="4"/>
            <path d="M150 40L260 150L150 260L40 150Z" fill="none" stroke="white" strokeWidth="3"/>
            <path d="M150 70L230 150L150 230L70 150Z" fill="none" stroke="white" strokeWidth="2"/>
            <path d="M150 100L200 150L150 200L100 150Z" fill="white" opacity="0.5"/>
            <path d="M150 120L180 150L150 180L120 150Z" fill="white"/>
          </svg>
          <svg width="200" height="200" viewBox="0 0 200 200" style={{position: 'absolute', left: '-30px', top: '50%', transform: 'translateY(-50%)', opacity: 0.05}}>
            <path d="M100 5L195 100L100 195L5 100Z" fill="none" stroke="white" strokeWidth="3"/>
            <path d="M100 30L170 100L100 170L30 100Z" fill="none" stroke="white" strokeWidth="2"/>
            <path d="M100 55L145 100L100 145L55 100Z" fill="white" opacity="0.4"/>
            <path d="M100 75L125 100L100 125L75 100Z" fill="white"/>
          </svg>
        </div>
        <div className="hero__content">
          <div className="hero__icon">◆</div>
          <h1 className="hero__title">Барахолка</h1>
          <p className="hero__subtitle">Платформа обмена вещами — продавайте и покупайте у соседей, просто и по-родному</p>
        </div>
      </section>

      {}
      <div className="divider">
        <div className="divider__ornament">
          <svg width="200" height="24" viewBox="0 0 200 24">
            <path d="M0 12h60" stroke="#d6cebf" strokeWidth="1.5" fill="none"/>
            <path d="M80 2L100 12L80 22L60 12Z" fill="none" stroke="#c8102e" strokeWidth="2"/>
            <path d="M80 6L96 12L80 18L64 12Z" fill="#c8102e" opacity="0.2"/>
            <path d="M80 9L92 12L80 15L68 12Z" fill="#c8102e"/>
            <path d="M120 2L140 12L120 22L100 12Z" fill="none" stroke="#c8102e" strokeWidth="2"/>
            <path d="M120 6L136 12L120 18L104 12Z" fill="#c8102e" opacity="0.2"/>
            <path d="M120 9L132 12L120 15L108 12Z" fill="#c8102e"/>
            <path d="M140 12h60" stroke="#d6cebf" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
      </div>

      {}
      <main className="app">
        <ListingList />
      </main>

      {}
      <div className="ornament-border" />
      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__brand">
            <span className="footer__logo">◆ Барахолка ◆</span>
            <p>Платформа обмена вещами — продавайте и покупайте у соседей</p>
          </div>
          <div className="footer__info">
            <p>Сделано с ❤️ в Беларуси · {new Date().getFullYear()}</p>
            <p className="footer__motto">«Што маем — не хаваем, а дзелімся з людзьмі»</p>
          </div>
        </div>
      </footer>

      {}
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
