# Listings API — Лабораторная работа №3 (JWT-аутентификация и авторизация)

REST API для платформы продажи и обмена подержанными вещами. Продолжение лабораторных работ №1 и №2: к существующему CRUD над объявлениями добавлена полноценная подсистема регистрации, входа и разграничения доступа на основе JWT-токенов и ролевой модели (RBAC).

## Предметная область

Ресурс **`listing`** — объявление о продаже или обмене подержанной вещи (без изменений с ЛР2, см. таблицу полей ниже). Добавлен новый ресурс **`user`** — учётная запись пользователя платформы.

### Listing

| Поле | Тип (Sequelize) | Тип в БД | Описание |
|---|---|---|---|
| `id` | INTEGER | serial, PK | Идентификатор, присваивается автоматически |
| `title` | STRING | varchar(255) | Название (обязательное) |
| `description` | TEXT | text | Описание |
| `category` | STRING | varchar(255) | Категория (обязательное) |
| `price` | DECIMAL(10,2) | numeric(10,2) | Цена; 0 означает обмен |
| `dealType` | STRING | varchar(255) | `sale` \| `exchange` — вычисляется автоматически из price |
| `condition` | STRING | varchar(255) | `new` \| `used` \| `for_parts` |
| `sellerId` | INTEGER | integer | Условный ID продавца |
| `status` | STRING | varchar(255) | `available` \| `reserved` \| `sold` |
| `viewsCount` | INTEGER | integer | Счётчик просмотров |
| `createdAt` / `updatedAt` | DATE | timestamp | Заполняются автоматически Sequelize |

### User

| Поле | Тип (Sequelize) | Тип в БД | Описание |
|---|---|---|---|
| `id` | INTEGER | serial, PK | Идентификатор, присваивается автоматически |
| `email` | STRING | varchar(255), unique | Email пользователя (обязательное, уникальное) |
| `passwordHash` | STRING | varchar(255) | Хеш пароля (bcrypt, 10 раундов) |
| `role` | STRING | varchar(255) | `user` \| `admin`, по умолчанию `user` |
| `createdAt` / `updatedAt` | DATE | timestamp | Заполняются автоматически Sequelize |

## Стек

Node.js, Express.js, Sequelize, PostgreSQL (локально через Homebrew), sequelize-cli, dotenv, jsonwebtoken, bcrypt.

## Установка и запуск

### 1. Предварительные требования
- Node.js установлен
- PostgreSQL установлен и запущен локально (`brew services start postgresql@16` — на macOS)

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка переменных окружения
Создайте файл `.env` в корне проекта:
```env
DATABASE_URL=postgres://ваш_логин@127.0.0.1:5432/listings_db
JWT_SECRET=любая-длинная-случайная-строка-минимум-32-символа
```

Сгенерировать надёжное значение для `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Файл `.env` не входит в систему контроля версий (в `.gitignore`). При запуске на другой машине его нужно создать заново со своими параметрами.

### 4. Применение миграций
```bash
npx sequelize-cli db:migrate
```
Создаст таблицы `Listings` и `Users`, а также добавит поле `viewsCount`.

### 5. Наполнение тестовыми данными (один раз)
```bash
npx sequelize-cli db:seed:all
```
Добавит 4 стартовых объявления и одного тестового администратора:
- email: `admin@listings.local`
- пароль: `Admin12345!`

Повторный запуск создаст дубли — выполняйте один раз.

### 6. Запуск сервера
```bash
npm run dev     # режим разработки, с автоперезапуском через nodemon
# либо
npm start       # обычный запуск
```

Сервер поднимется на `http://localhost:3000`.

## Таблица маршрутов

### Объявления 

| Метод | Путь | Описание | Успешный статус | Статусы ошибок |
|---|---|---|---|---|
| GET | `/listings` | Список всех объявлений. Фильтры: `?category=`, `?status=`, `?dealType=` | 200 | — |
| GET | `/listings/:id` | Получить одно объявление по id | 200 | 404, 400 |
| POST | `/listings` | Создать новое объявление | 201 | 400 |
| PUT | `/listings/:id` | Полностью обновить объявление | 200 | 404, 400 |
| DELETE | `/listings/:id` | Удалить объявление | 200 | 404 |

### Аутентификация и авторизация 

| Метод | Путь | Описание | Успешный статус | Статусы ошибок |
|---|---|---|---|---|
| POST | `/auth/register` | Регистрация нового пользователя (email, password) | 201 | 400 |
| POST | `/auth/login` | Вход, выдача JWT-токена (email, password) | 200 | 401 |
| GET | `/profile` | Данные текущего пользователя. Требует заголовок `Authorization: Bearer <token>` | 200 | 401 |
| GET | `/admin/users` | Список всех пользователей. Требует токен + роль `admin` | 200 | 401, 403 |

Контракт `/listings` идентичен лабораторным работам №1–2 — та же Postman-коллекция подходит без изменений. Для новых маршрутов используется отдельная коллекция `Auth`.

## Как получить и использовать токен

1. Зарегистрироваться (`POST /auth/register`) либо войти под существующей учётной записью (`POST /auth/login`)
2. В ответе на `/auth/login` придёт `{ "token": "...", "user": {...} }`
3. Для запросов к защищённым маршрутам добавить заголовок:
```
Authorization: Bearer <полученный_токен>
```
4. Токен действителен 1 час (`expiresIn: '1h'`), после истечения срока нужно войти заново

## Ролевая модель (RBAC)

Регистрация через `/auth/register` всегда создаёт пользователя с ролью `user`. Роль `admin` присваивается только через сид-файл (`seeders/..._demo-admin.js`) — создание администратора через публичный эндпоинт недоступно. Маршрут `/admin/users` защищён двумя middleware подряд — сначала `authenticate` (проверка токена), затем `isAdmin` (проверка роли); при недостаточных правах возвращается `403 Forbidden`.

## Структура проекта

```
listings-api/
├── config/
│   └── config.js
├── migrations/
│   ├── ..._create-listing.js
│   ├── ..._add-viewsCount-to-listings.js
│   └── ..._create-user.js
├── seeders/
│   ├── ..._demo-listings.js
│   └── ..._demo-admin.js
├── models/
│   ├── index.js
│   ├── listing.js
│   └── user.js
├── controllers/
│   ├── listingsController.js
│   ├── authController.js
│   └── adminController.js
├── routes/
│   ├── listings.js
│   ├── auth.js
│   ├── profile.js
│   └── admin.js
├── middleware/
│   ├── errorHandler.js
│   ├── auth.js
│   └── isAdmin.js
├── .sequelizerc
├── .env
├── server.js
└── README.md
```

## Полезные команды Sequelize CLI

```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:migrate:undo
npx sequelize-cli db:seed:all
npx sequelize-cli migration:generate --name имя-миграции
npx sequelize-cli model:generate --name Имя --attributes поле:тип
```

