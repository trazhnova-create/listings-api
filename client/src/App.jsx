import './App.css';
import ListingList from './components/ListingList';

function App() {
  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <span className="topbar__logo">Барахолка</span>
          <span className="topbar__tagline">вещи с историей — по-соседски</span>
        </div>
        <div className="ornament" />
      </header>

      <main className="app">
        <ListingList />
      </main>
    </>
  );
}

export default App;