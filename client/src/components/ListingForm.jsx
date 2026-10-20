import { useState, useEffect } from 'react';

const DRAFT_KEY = 'listingDraft';
const EMPTY_FORM = { title: '', category: '', price: '', image: '' };

function ListingForm({ onSave, editingItem, onCancelEdit, categories }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editingItem) {
      setForm({
        title: editingItem.title,
        category: editingItem.category,
        price: editingItem.price,
        image: editingItem.image || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingItem]);

  useEffect(() => {
    if (editingItem) return;
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (draft) setForm(draft);
    } catch (err) {
      console.error('Ошибка чтения черновика:', err);
    }
  }, []);

  useEffect(() => {
    if (editingItem) return;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }, 500);
    return () => clearTimeout(timer);
  }, [form, editingItem]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.category || !form.price) return;

    onSave({
      ...(editingItem ? { id: editingItem.id } : {}),
      title: form.title.trim(),
      category: form.category,
      price: Number(form.price),
      image: form.image.trim(),
    });

    if (!editingItem) {
      setForm(EMPTY_FORM);
      localStorage.removeItem(DRAFT_KEY);
    }
  }

  return (
    <form className="listing-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Название"
        value={form.title}
        onChange={(e) => updateField('title', e.target.value)}
      />

      <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
        <option value="" disabled>Категория</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Цена, Br"
        value={form.price}
        onChange={(e) => updateField('price', e.target.value)}
      />

      <input
        type="text"
        placeholder="Ссылка на фото (необязательно)"
        value={form.image}
        onChange={(e) => updateField('image', e.target.value)}
      />

      <div className="listing-form__buttons">
        <button type="submit">{editingItem ? 'Сохранить' : 'Добавить'}</button>
        {editingItem && (
          <button type="button" className="btn-cancel" onClick={onCancelEdit}>
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}

export default ListingForm;