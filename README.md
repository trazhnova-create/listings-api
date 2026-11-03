# Listings API + «Барахолка» — Лабораторная работа №5 (взаимодействие React с сервером)

Курсовой проект **«Платформа для продажи и обмена подержанными вещами с чатом между пользователями»**. В лабораторной работе №5 клиентское приложение «Барахолка» (React, ЛР №4) вместо `localStorage` работает с REST API из ЛР №1–3 (Node.js + Express + PostgreSQL + JWT).

Ветка репозитория: `25`

## Стек

- **Сервер:** Node.js, Express.js, Sequelize, PostgreSQL, JWT (jsonwebtoken), bcrypt, cors, multer
- **Клиент:** React 19, Vite, axios

## Возможности

- Получение списка объявлений с сервера со спиннером загрузки и сообщением об ошибке с кнопкой «Повторить».
- Добавление, редактирование и удаление объявлений с **оптимистичным обновлением** интерфейса и откатом изменений при ошибке сервера (с уведомлением).
- Регистрация и вход (email + пароль). JWT-токен сохраняется в `localStorage` и автоматически подставляется в запросы через interceptor axios. При истёкшем токене (401) пользователь автоматически разлогинивается.
- Права доступа: просмотр открыт всем, создание, изменение и удаление — только после входа. Менять и удалять можно свои объявления, администратору доступны любые.

### Дополнительные улучшения

| Улучшение | Реализация |
|---|---|
| Пагинация | Кнопка «Загрузить ещё», серверные параметры `limit` / `offset`, общее число в заголовке `X-Total-Count` |
| Поиск на сервере с debounce | Параметр `search` (без учёта регистра, `iLike`), debounce 500 мс на клиенте |
| Фильтры и сортировка на сервере | Параметры `category`, `minPrice`, `maxPrice`, `sort` |
| Отмена запросов | `AbortController`: устаревший запрос отменяется при новом вводе и при размонтировании |
| Повтор запроса (retry) | До 3 попыток с задержкой 500 мс → 1000 мс при сетевой ошибке или 5xx (только для GET) |
| Загрузка изображений | `FormData` + эндпоинт `POST /listings/upload` (multer), индикатор прогресса загрузки |

## Установка и запуск

### 1. Предварительные требования
- Node.js
- PostgreSQL, запущенный локально, база `listings_db`

### 2. Сервер (корень репозитория)

```bash
npm install
```

Файл `.env` в корне проекта:
```env
DATABASE_URL=postgres://ваш_логин:пароль@localhost:5432/listings_db
JWT_SECRET=любая-длинная-случайная-строка-минимум-32-символа
```

Миграции и тестовые данные:
```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```
Сид создаёт 4 объявления и администратора: `admin@listings.local` / `Admin12345!`.

Запуск:
```bash
npm run dev
```
Сервер: `http://localhost:3000`.

Имитация медленного сервера (для проверки спиннера):
```bash
DELAY_MS=1500 npm run dev
```

### 3. Клиент (папка `client`)

```bash
cd client
npm install
```

Файл `client/.env`:
```env
VITE_API_URL=http://localhost:3000
```
Vite читает `.env` только при старте — после изменения перезапустите его.

Запуск:
```bash
npm run dev
```
Клиент: `http://localhost:5173`.

> Файлы `.env` не входят в систему контроля версий. Папка `uploads/` (загруженные фото) тоже в `.gitignore`.

## Маршруты API

### Объявления

| Метод | Путь | Описание | Доступ | Статусы |
|---|---|---|---|---|
| GET | `/listings` | Список объявлений. Параметры: `search`, `category`, `minPrice`, `maxPrice`, `sort` (`new`, `old`, `priceAsc`, `priceDesc`), `limit`, `offset`. Общее число — в заголовке `X-Total-Count` | все | 200 |
| GET | `/listings/:id` | Одно объявление | все | 200, 400, 404 |
| POST | `/listings` | Создать объявление (владелец берётся из токена) | токен | 201, 400, 401 |
| PUT | `/listings/:id` | Изменить объявление | владелец / админ | 200, 400, 401, 403, 404 |
| DELETE | `/listings/:id` | Удалить объявление | владелец / админ | 200, 400, 401, 403, 404 |
| POST | `/listings/upload` | Загрузить фото (`multipart/form-data`, поле `image`, до 5 МБ), возвращает `{ url }` | токен | 201, 400, 401 |

### Аутентификация (из ЛР №3)

| Метод | Путь | Описание | Доступ |
|---|---|---|---|
| POST | `/auth/register` | Регистрация (email, password) | все |
| POST | `/auth/login` | Вход, выдача JWT | все |
| GET | `/profile` | Данные текущего пользователя | токен |
| GET | `/admin/users` | Список пользователей | токен + роль `admin` |

Токен передаётся в заголовке `Authorization: Bearer <token>`.

## Соответствие требованиям лабораторной работы

| Требование | Где реализовано |
|---|---|
| Сервис API на axios с interceptor токена | `client/src/api.js` |
| GET со состояниями загрузки и ошибки, кнопка «Повторить» | `client/src/components/ListingList.jsx`, `renderContent()` |
| POST с оптимистичным обновлением | `createNew` в `ListingList.jsx` |
| PUT с оптимистичным обновлением и откатом | `editExisting` в `ListingList.jsx` |
| DELETE с оптимистичным обновлением и откатом | `removeListing` в `ListingList.jsx` |
| Дополнительные улучшения | `ListingList.jsx`, `api.js`, `ListingForm.jsx`, `routes/listings.js` |
| CORS на сервере | `server.js` |

## Структура проекта

```
listings-api/
├── client/                         # React-приложение
│   ├── .env
│   └── src/
│       ├── api.js                  # axios, interceptors, retry, запросы к API
│       ├── AuthContext.jsx         # состояние авторизации
│       ├── App.jsx
│       ├── App.css
│       └── components/
│           ├── ListingList.jsx     # список, CRUD, пагинация, фильтры
│           ├── ListingForm.jsx     # форма, загрузка фото
│           ├── ListingFilters.jsx  # панель фильтров
│           └── AuthModal.jsx       # окно входа / регистрации
├── config/config.js
├── controllers/
│   ├── listingsController.js
│   ├── authController.js
│   └── adminController.js
├── middleware/
│   ├── auth.js
│   ├── isAdmin.js
│   └── errorHandler.js
├── migrations/
├── models/
├── routes/
├── seeders/
├── uploads/                     
├── .env
├── server.js
└── README.md
```

## Дальнейшее развитие

- Реализация чата между покупателем и продавцом
- Привязка избранного и откликов к пользователю