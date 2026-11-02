import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);


const normalize = (item) => ({
  ...item,
  price: Number(item.price),
  image: item.image || '',
});

export const isCancel = axios.isCancel;


export function getErrorMessage(err) {
  if (err.response) {
    const { status, data } = err.response;
    if (status >= 500) return `Ошибка сервера (${status}). Попробуйте позже.`;
    return data?.error || `Ошибка запроса (${status})`;
  }
  if (err.code === 'ECONNABORTED') return 'Сервер не ответил вовремя.';
  return 'Сервер недоступен. Проверьте, что он запущен.';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


async function withRetry(fn, attempts = 3, delay = 500) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const retryable = !axios.isCancel(err) && (!err.response || status >= 500);
      if (!retryable || i === attempts - 1) break;
      await sleep(delay * 2 ** i); 
    }
  }
  throw lastError;
}


export const registerRequest = (email, password) =>
  api.post('/auth/register', { email, password });


export async function loginRequest(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}


export async function fetchListings(params = {}, signal) {
  const { data, headers } = await withRetry(() =>
    api.get('/listings', { params, signal })
  );
  return {
    items: data.map(normalize),
    total: Number(headers['x-total-count']) || data.length,
  };
}


export async function addListing(listing) {
  const { data } = await api.post('/listings', listing);
  return normalize(data);
}


export async function updateListing(id, updated) {
  const { data } = await api.put(`/listings/${id}`, updated);
  return normalize(data);
}


export const deleteListing = (id) => api.delete(`/listings/${id}`);


export async function uploadImage(file, onProgress) {
  const form = new FormData();
  form.append('image', file);
  
  const { data } = await api.post('/listings/upload', form, {
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
    },
  });
  return data.url;
}