import { useState, useEffect, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import ListingForm from './ListingForm';
import ListingFilters from './ListingFilters';

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

const initialListings = [
  { id: 1, title: 'Зимняя куртка The North Face', category: 'Одежда', price: 90, image: '' },
  { id: 2, title: 'iPhone 12, 128GB', category: 'Электроника', price: 650, image: '' },
];

function ListingList() {
  const [listings, setListings] = useLocalStorage('listings', initialListings);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.title = `Объявлений: ${listings.length} — Барахолка`;
  }, [listings.length]);

  function saveListing(data) {
    if (data.id) {
      setListings((prev) =>
        prev.map((item) => (item.id === data.id ? { ...item, ...data } : item))
      );
      setEditingItem(null);
    } else {
      setListings((prev) => [{ ...data, id: Date.now() }, ...prev]);
    }
  }

  function removeListing(id) {
    setListings((prev) => prev.filter((item) => item.id !== id));
    if (editingItem && editingItem.id === id) setEditingItem(null);
  }

  function startEdit(item) {
    setEditingItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingItem(null);
  }

  const visibleListings = useMemo(() => {
    let result = [...listings];

    if (categoryFilter !== 'all') {
      result = result.filter((item) => item.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => item.title.toLowerCase().includes(q));
    }

    if (minPrice !== '') {
      result = result.filter((item) => item.price >= Number(minPrice));
    }

    if (maxPrice !== '') {
      result = result.filter((item) => item.price <= Number(maxPrice));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'priceAsc':
          return a.price - b.price;
        case 'priceDesc':
          return b.price - a.price;
        case 'old':
          return a.id - b.id;
        case 'new':
        default:
          return b.id - a.id;
      }
    });

    return result;
  }, [listings, categoryFilter, sortBy, searchQuery, minPrice, maxPrice]);

  const totalSum = useMemo(
    () => visibleListings.reduce((sum, item) => sum + item.price, 0),
    [visibleListings]
  );

  return (
    <div>
      <h1 className="app__title">Мои объявления</h1>
      <p className="app__subtitle">Продавайте и покупайте вещи у соседей</p>

      <ListingForm
        onSave={saveListing}
        editingItem={editingItem}
        onCancelEdit={cancelEdit}
        categories={CATEGORIES}
      />

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
        Показано: {visibleListings.length} из {listings.length} · на сумму{' '}
        {totalSum.toLocaleString('ru-RU')} Br
      </p>

      {isLoading ? (
        <p className="loading-state">Загрузка...</p>
      ) : visibleListings.length === 0 ? (
        <p className="empty-state">Ничего не найдено по заданным фильтрам</p>
      ) : (
        <ul className="listing-list">
          {visibleListings.map((item) => (
            <li key={item.id} className="listing-card">
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

              <div className="listing-card__actions">
                <button className="btn-edit" onClick={() => startEdit(item)}>
                  Изменить
                </button>
                <button className="btn-delete" onClick={() => removeListing(item.id)}>
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ListingList;