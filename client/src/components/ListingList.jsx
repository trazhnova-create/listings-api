import { useState, useEffect, useRef } from 'react';
import ListingForm from './ListingForm';
import ListingFilters from './ListingFilters';
import { useAuth } from '../AuthContext';
import {
  fetchListings,
  addListing,
  updateListing,
  deleteListing,
  isCancel,
  getErrorMessage,
} from '../api';

export const CATEGORIES = [
  'Электроника',
  'Одежда',
  'Мебель',
  'Книги',
  'Спорт и отдых',
  'Детские товары',
  'Бытовая техника',
  'Другое',
];

const PAGE_SIZE = 5; 
const DEFAULT_PARAMS = { search: '', category: 'all', sort: 'new', minPrice: '', maxPrice: '' };

function buildQuery(p) {
  const q = { sort: p.sort };
  if (p.search) q.search = p.search;
  if (p.category !== 'all') q.category = p.category;
  if (p.minPrice !== '') q.minPrice = p.minPrice;
  if (p.maxPrice !== '') q.maxPrice = p.maxPrice;
  return q;
}

function ListingList() {
  const { user, openAuth } = useAuth();

  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(null);

  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('new');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [editingItem, setEditingItem] = useState(null);

  const paramsKey = JSON.stringify(params);
  const paramsKeyRef = useRef(paramsKey);
  useEffect(() => {
    paramsKeyRef.current = paramsKey;
  }, [paramsKey]);

  
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams({
        search: searchQuery.trim(),
        category: categoryFilter,
        sort: sortBy,
        minPrice,
        maxPrice,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter, sortBy, minPrice, maxPrice]);

  
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const query = { ...buildQuery(JSON.parse(paramsKey)), limit: PAGE_SIZE, offset: 0 };

    fetchListings(query, controller.signal)
      .then(({ items, total }) => {
        setListings(items);
        setTotal(total);
      })
      .catch((err) => {
        if (isCancel(err)) return; 
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [paramsKey, reloadKey]);

  
  async function loadMore() {
    const keyAtStart = paramsKey;
    
    const offset = listings.filter((item) => !item.pending).length;

    setIsLoadingMore(true);
    try {
      const query = { ...buildQuery(params), limit: PAGE_SIZE, offset };
      const { items, total } = await fetchListings(query);
      if (keyAtStart !== paramsKeyRef.current) return;
      
      setListings((prev) => [...prev, ...items.filter((it) => !prev.some((p) => p.id === it.id))]);
      setTotal(total);
    } catch (err) {
      notify(`Не удалось загрузить ещё: ${getErrorMessage(err)}`);
    } finally {
      setIsLoadingMore(false);
    }
  }

  
  useEffect(() => {
    if (!user) setEditingItem(null);
  }, [user]);

  useEffect(() => {
    document.title = `Объявлений: ${total} — Барахолка`;
  }, [total]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function notify(text) {
    setNotice({ id: Date.now(), text });
  }

  
  async function createNew(payload) {
    const tempId = Date.now();
    setListings((prev) => [{ ...payload, id: tempId, sellerId: user.id, pending: true }, ...prev]);
    setTotal((t) => t + 1);

    try {
      const saved = await addListing(payload);
      setListings((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
    } catch (err) {
      setListings((prev) => prev.filter((item) => item.id !== tempId));
      setTotal((t) => t - 1);
      notify(`Не удалось добавить объявление: ${getErrorMessage(err)}`);
    }
  }

  
  async function editExisting(id, payload) {
    const previous = listings.find((item) => item.id === id);
    setListings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...payload, pending: true } : item))
    );

    try {
      const saved = await updateListing(id, payload);
      setListings((prev) => prev.map((item) => (item.id === id ? saved : item)));
    } catch (err) {
      setListings((prev) => prev.map((item) => (item.id === id ? previous : item)));
      notify(`Не удалось сохранить изменения: ${getErrorMessage(err)}`);
    }
  }

  function saveListing(data) {
    if (!user) {
      openAuth();
      return Promise.resolve();
    }

    const payload = {
      title: data.title,
      category: data.category,
      price: data.price,
      image: data.image,
    };

    if (data.id) {
      setEditingItem(null);
      return editExisting(data.id, payload);
    }
    return createNew(payload);
  }

  
  async function removeListing(id) {
    const removed = listings.find((item) => item.id === id);
    setListings((prev) => prev.filter((item) => item.id !== id));
    setTotal((t) => t - 1);
    if (editingItem && editingItem.id === id) setEditingItem(null);

    try {
      await deleteListing(id);
    } catch (err) {
      if (err.response?.status === 404) return; 
      setListings((prev) => [removed, ...prev]);
      setTotal((t) => t + 1);
      notify(`Не удалось удалить объявление: ${getErrorMessage(err)}`);
    }
  }

  
  const canManage = (item) =>
    !!user && (user.role === 'admin' || item.sellerId === user.id);

  function startEdit(item) {
    setEditingItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderContent() {
    if (isLoading) {
      return (
        <p className="loading-state">
          <span className="spinner" />
          Загрузка...
        </p>
      );
    }

    if (error) {
      return (
        <div className="error-box" role="alert">
          <p>{error}</p>
          <button onClick={() => setReloadKey((key) => key + 1)}>Повторить</button>
        </div>
      );
    }

    if (listings.length === 0) {
      return <p className="empty-state">Ничего не найдено по заданным фильтрам</p>;
    }

    return (
      <>
        <ul className="listing-list">
          {listings.map((item) => (
            <li
              key={item.id}
              className={`listing-card${item.pending ? ' listing-card--pending' : ''}`}
            >
              <div className="listing-card__photo">
                {item.image ? (
                  <img src={item.image} alt={item.title} />
                ) : (
                  <span className="listing-card__photo-placeholder">
                    {item.title.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="listing-card__body">
                <span className="listing-card__title">{item.title}</span>
                <div className="listing-card__meta">
                  <span className="listing-card__price">
                    {item.price.toLocaleString('ru-RU')} Br
                  </span>
                  <span className="listing-card__category">{item.category}</span>
                </div>
              </div>

              {canManage(item) && (
                <div className="listing-card__actions">
                  <button
                    className="btn-edit"
                    disabled={item.pending}
                    onClick={() => startEdit(item)}
                  >
                    Изменить
                  </button>
                  <button
                    className="btn-delete"
                    disabled={item.pending}
                    onClick={() => removeListing(item.id)}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {listings.length < total && (
          <button className="load-more" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? 'Загрузка...' : `Загрузить ещё (${total - listings.length})`}
          </button>
        )}
      </>
    );
  }

  return (
    <div>
      <h1 className="app__title">Мои объявления</h1>
      <p className="app__subtitle">Продавайте и покупайте вещи у соседей</p>

      {user ? (
        <ListingForm
          onSave={saveListing}
          editingItem={editingItem}
          onCancelEdit={() => setEditingItem(null)}
          categories={CATEGORIES}
        />
      ) : (
        <div className="login-hint">
          <span>Чтобы подать объявление, войдите в аккаунт.</span>
          <button onClick={openAuth}>Войти</button>
        </div>
      )}

      <ListingFilters
        categories={CATEGORIES}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
      />

      <p className="app__subtitle">
        Показано: {listings.length} из {total}
      </p>

      {renderContent()}

      {notice && (
        <div className="toast" role="alert">
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default ListingList;