import { useState, useEffect } from 'react';
import { uploadImage, getErrorMessage } from '../api';

const DRAFT_KEY = 'listingDraft';
const EMPTY_FORM = { title: '', category: '', price: '', image: '' };

function ListingForm({ onSave, editingItem, onCancelEdit, categories }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [progress, setProgress] = useState(null); // null — не грузим, 0..100 — идёт загрузка
  const [uploadError, setUploadError] = useState('');

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

  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = ''; 
    if (!file) return;

    setUploadError('');
    setProgress(0);
    try {
      const url = await uploadImage(file, setProgress);
      updateField('image', url);
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setProgress(null);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (progress !== null) return; 
    if (!form.title.trim() || !form.category || !form.price) return;

    onSave({
      ...(editingItem ? { id: editingItem.id } : {}),
      title: form.title.trim(),
      category: form.category,
      price: Number(form.price),
      image: form.image,
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

      <div className="file-field">
        <label className="file-btn">
          {form.image ? 'Заменить фото' : 'Выбрать фото'}
          <input type="file" accept="image/*" onChange={handleFile} hidden />
        </label>

        {progress !== null && (
          <div className="progress" title={`${progress}%`}>
            <div className="progress__bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        {form.image && progress === null && (
          <span className="file-preview">
            <img src={form.image} alt="" />
            <button type="button" onClick={() => updateField('image', '')} aria-label="Убрать фото">
              ×
            </button>
          </span>
        )}

        {uploadError && <span className="modal__error">{uploadError}</span>}
      </div>

      <div className="listing-form__buttons">
        <button type="submit" disabled={progress !== null}>
          {editingItem ? 'Сохранить' : 'Добавить'}
        </button>
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