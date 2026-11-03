# Listings API — Лабораторная работа №6 (MongoDB + Mongoose)

REST API для платформы продажи и обмена подержанными вещами. Это альтернативная реализация сервера из ЛР №1–5: реляционная БД PostgreSQL (Sequelize) заменена на документную **MongoDB** (ODM **Mongoose**). Внешний контракт API сохранён, поэтому React-клиент из ЛР №5 работает без изменений.

Ветка репозитория: `lab26`

## Стек

Node.js, Express.js, MongoDB Atlas (кластер M0), Mongoose, JWT (jsonwebtoken), bcrypt, cors, multer, dotenv.

## Модель данных (документная)

### Коллекция `listings`

| Поле | Тип | Описание |
|---|---|---|
| `_id` | ObjectId | Идентификатор (в API отдаётся как строка `id`) |
| `title` | String | Название (обязательное) |
| `description` | String | Описание |
| `category` | String | Категория (обязательное) |
| `price` | Number | Цена; 0 означает обмен |
| `dealType` | String | `sale` / `exchange`, вычисляется автоматически из цены |
| `condition` | String | `new` / `used` / `for_parts` |
| `status` | String | `available` / `reserved` / `sold` |
| `image` | String | Ссылка на фото |
| `viewsCount` | Number | Счётчик просмотров |
| `sellerId` | ObjectId → `users` | Владелец объявления |
| `tags` | **[String]** | **Массив** тегов |
| `location` | **{ city, district }** | **Вложенный объект** |
| `comments` | **[ { userId, author, text, likes, createdAt } ]** | **Массив вложенных документов** |
| `createdAt` / `updatedAt` | Date | Заполняются автоматически |

### Коллекция `users`

`email` (уникальный индекс), `passwordHash` (bcrypt), `role` (`user` / `admin`), `createdAt`, `updatedAt`.

### Чем это отличается от PostgreSQL

В реляционной схеме комментарии и теги пришлось бы выносить в отдельные таблицы (`Comments`, `Tags`, связующая `ListingTags`) и собирать через `JOIN`. В MongoDB объявление вместе с комментариями, тегами и адресом хранится одним документом, который читается одним запросом. Платой за это становятся дублирование данных и сложность запросов, которые охватывают много документов.

## Установка и запуск

### 1. MongoDB Atlas
1. Зарегистрироваться на cloud.mongodb.com, создать бесплатный кластер M0.
2. Создать пользователя базы данных, сохранить пароль.
3. В Network Access добавить свой IP.
4. Connect → Drivers → скопировать строку подключения и дописать имя базы `listings_db`.

> Если `mongodb+srv://` не подключается (ошибка `queryTxt ETIMEOUT`), смените DNS на `1.1.1.1` / `8.8.8.8` или используйте строку подключения без `+srv`.

### 2. Зависимости
```bash
npm install
```

### 3. Файл `.env` в корне
```env
MONGO_URI=mongodb+srv://ЛОГИН:ПАРОЛЬ@cluster0.xxxxx.mongodb.net/listings_db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=длинная-случайная-строка-минимум-32-символа
```
Сгенерировать секрет:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
`.env` не входит в систему контроля версий.

### 4. Тестовые данные (один раз)
```bash
npm run seed
```
Скрипт очищает коллекции и создаёт 2 пользователей и 4 объявления.
- администратор: `admin@listings.local` / `Admin12345!`
- пользователь: `seller@test.com` / `MyPass123`

### 5. Запуск
```bash
npm run dev
```
Сервер: `http://localhost:3000`. Клиент (папка `client`) запускается отдельно командой `npm run dev` в ней.

## Маршруты API

### Объявления

| Метод | Путь | Описание | Доступ | Статусы |
|---|---|---|---|---|
| GET | `/listings` | Список. Параметры: `search`, `category`, `tag`, `city`, `minPrice`, `maxPrice`, `sort`, `limit`, `offset`. Общее число в заголовке `X-Total-Count` | все | 200 |
| GET | `/listings/:id` | Одно объявление (счётчик просмотров +1 через `$inc`) | все | 200, 400, 404 |
| POST | `/listings` | Создать (владелец берётся из токена) | токен | 201, 400, 401 |
| PUT | `/listings/:id` | Изменить | владелец / админ | 200, 400, 401, 403, 404 |
| DELETE | `/listings/:id` | Удалить, в ответе удалённый документ | владелец / админ | 200, 401, 403, 404 |
| POST | `/listings/upload` | Загрузить фото (`multipart/form-data`, поле `image`) | токен | 201, 400, 401 |

### Вложенные документы (комментарии)

| Метод | Путь | Описание | Оператор MongoDB |
|---|---|---|---|
| POST | `/listings/:id/comments` | Добавить комментарий | `$push` |
| POST | `/listings/:id/comments/:commentId/like` | Поставить лайк комментарию (обновление элемента внутри массива) | `$inc` + позиционный `$` |
| DELETE | `/listings/:id/comments/:commentId` | Удалить комментарий (автор или админ) | `$pull` |

### Аутентификация

| Метод | Путь | Описание | Доступ |
|---|---|---|---|
| POST | `/auth/register` | Регистрация | все |
| POST | `/auth/login` | Вход, выдача JWT | все |
| GET | `/profile` | Текущий пользователь | токен |
| GET | `/admin/users` | Список пользователей | токен + роль `admin` |

Токен передаётся заголовком `Authorization: Bearer <token>`. Идентификаторы `:id` и `:commentId` — это ObjectId (24 hex-символа), при неверном формате сервер возвращает 400.

## Использованные возможности Mongoose

- схемы и модели, вложенный документ (`commentSchema`), массивы, вложенный объект;
- валидация (`required`, `enum`, `min`, `maxlength`, `match`) и хук `pre('validate')` для пересчёта `dealType`;
- метод экземпляра `canBeModifiedBy`;
- индексы: уникальный по `users.email`, составной `{category, price}`, по `tags`;
- цепочки запросов `find().sort().skip().limit()`, `countDocuments`;
- `findByIdAndUpdate`, `findOneAndUpdate`, `findByIdAndDelete`, `updateOne`;
- `toJSON`-преобразование (`_id` → `id`).

## Структура проекта

```
listings-api/
├── client/                    # React-клиент (ЛР №5), без изменений
├── controllers/
│   ├── listingsController.js
│   ├── authController.js
│   └── adminController.js
├── middleware/                # auth, isAdmin, errorHandler
├── models/
│   ├── index.js
│   ├── listing.js
│   └── user.js
├── routes/
├── scripts/
│   └── seed.js                # тестовые данные
├── uploads/                   # загруженные фото (не в git)
├── db.js                      # подключение к MongoDB
├── server.js
├── .env
└── README.md
```

## Связь с предыдущими работами

Реализация на PostgreSQL + Sequelize находится в ветке `lab25`. В ветке `lab26` сервер переписан под MongoDB, маршруты и формат ответов сохранены.