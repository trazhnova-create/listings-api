# Listings API — Лабораторная работа №2 (PostgreSQL + Sequelize)

REST API для платформы продажи и обмена подержанными вещами. Продолжение лабораторной работы №1: та же слоистая архитектура и тот же внешний контракт API, но временный массив в памяти заменён на постоянное хранение данных в PostgreSQL через ORM Sequelize.

## Предметная область

Ресурс **`listing`** — объявление о продаже или обмене подержанной вещи.

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
| `viewsCount` | INTEGER | integer | Счётчик просмотров (добавлено отдельной миграцией) |
| `createdAt` / `updatedAt` | DATE | timestamp | Заполняются автоматически Sequelize |

## Стек

Node.js, Express.js, Sequelize, PostgreSQL (локально через Homebrew), sequelize-cli, dotenv.

## Установка и запуск

### 1. Предварительные требования
- Node.js установлен
- PostgreSQL установлен и запущен локально (`brew services start postgresql@16` — на macOS)

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка базы данных
Создайте локальную базу (если ещё не создана):
```bash
createdb listings_db
```

Создайте файл `.env` в корне проекта:
```env
DATABASE_URL=postgres://ваш_логин_мак@127.0.0.1:5432/listings_db
```

> Файл `.env` не входит в систему контроля версий (в `.gitignore`). При запуске на другой машине его нужно создать заново со своими параметрами подключения.

### 4. Применение миграций
```bash
npx sequelize-cli db:migrate
```
Создаст таблицу `Listings` (первая миграция) и добавит поле `viewsCount` (вторая миграция).

### 5. Наполнение тестовыми данными (один раз)
```bash
npx sequelize-cli db:seed:all
```
Добавит 4 стартовых объявления. Повторный запуск создаст дубли — выполняйте один раз.

### 6. Запуск сервера
```bash
npm run dev     # режим разработки, с автоперезапуском через nodemon
# либо
npm start       # обычный запуск
```

Сервер поднимется на `http://localhost:3000`.

## Таблица маршрутов

| Метод | Путь | Описание | Успешный статус | Статусы ошибок |
|---|---|---|---|---|
| GET | `/listings` | Список всех объявлений. Фильтры: `?category=`, `?status=`, `?dealType=` | 200 | — |
| GET | `/listings/:id` | Получить одно объявление по id | 200 | 404, 400 |
| POST | `/listings` | Создать новое объявление | 201 | 400 |
| PUT | `/listings/:id` | Полностью обновить объявление | 200 | 404, 400 |
| DELETE | `/listings/:id` | Удалить объявление | 200 | 404 |

Контракт API идентичен лабораторной работе №1 — та же Postman-коллекция (`postman_collection.json`) подходит без изменений.

## Структура проекта

```
listings-api/
├── config/
│   └── config.js             
├── migrations/
│   ├── ..._create-listing.js         
│   └── ..._add-viewsCount-to-listings.js  
├── seeders/
│   └── ..._demo-listings.js   
├── models/
│   ├── index.js               
│   └── listing.js              
├── controllers/
│   └── listingsController.js  
├── routes/
│   └── listings.js            
├── middleware/
│   └── errorHandler.js        
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

## Дальнейшее развитие (следующие лабораторные работы)

- JWT-аутентификация пользователей (лабораторная работа №3)
- Реализация чата между покупателем и продавцом
- Интеграция сервера с React-фронтендом (из 1 части курса)