# Listings API — Лабораторная работа №1

REST API для платформы продажи и обмена подержанными вещами (курсовой проект).
Реализует базовые CRUD-операции над объявлениями (`listings`) с хранением данных
в памяти сервера, как того требует задание. Node.js + Express.js.

## Предметная область

Ресурс **`listing`** — объявление о продаже или обмене подержанной вещи.

Поля объявления:

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | Идентификатор (генерируется сервером) |
| `title` | string | Название объявления (обязательное) |
| `description` | string | Описание вещи |
| `category` | string | Категория (обязательное), напр. "Электроника", "Одежда" |
| `price` | number | Цена; `0` означает обмен |
| `dealType` | string | `sale` \| `exchange` (вычисляется автоматически по price) |
| `condition` | string | `new` \| `used` \| `for_parts` |
| `sellerId` | number | Условный ID продавца (без авторизации) |
| `status` | string | `available` \| `reserved` \| `sold` |
| `createdAt` | string (ISO) | Дата создания (генерируется сервером) |

## Установка и запуск

```bash
npm install
npm run dev     # запуск в режиме разработки (nodemon, автоперезапуск)
# либо
npm start       # обычный запуск
```

Сервер поднимается на `http://localhost:3000` (или на `PORT` из переменных окружения).

## Таблица маршрутов

| Метод | Путь | Описание | Успешный статус | Статусы ошибок |
|---|---|---|---|---|
| GET | `/listings` | Список всех объявлений. Поддерживает query-фильтры: `?category=`, `?status=`, `?dealType=` | 200 | — |
| GET | `/listings/:id` | Получить одно объявление по id | 200 | 404 (не найдено), 400 (id не число) |
| POST | `/listings` | Создать новое объявление | 201 | 400 (невалидные данные) |
| PUT | `/listings/:id` | Полностью обновить объявление | 200 | 404 (не найдено), 400 (невалидные данные) |
| DELETE | `/listings/:id` | Удалить объявление | 200 | 404 (не найдено, в т.ч. при повторном удалении) |

## Примеры curl-запросов

### GET /listings — список всех объявлений
```bash
curl -s http://localhost:3000/listings
```

### GET /listings с фильтром по категории
```bash
curl -s "http://localhost:3000/listings?category=Электроника"
```

### GET /listings/:id — один элемент
```bash
curl -s http://localhost:3000/listings/1
```

### GET /listings/:id — 404, если не найден
```bash
curl -s -w "\nStatus: %{http_code}\n" http://localhost:3000/listings/999
# => {"error":"Listing not found"}  Status: 404
```

### POST /listings — создать объявление
```bash
curl -s -X POST http://localhost:3000/listings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Наушники Sony WH-1000XM4",
    "description": "Комплект полный, коробка сохранена",
    "category": "Электроника",
    "price": 12000,
    "condition": "used",
    "sellerId": 2
  }'
```

### POST /listings — 400 при невалидных данных
```bash
curl -s -w "\nStatus: %{http_code}\n" -X POST http://localhost:3000/listings \
  -H "Content-Type: application/json" \
  -d '{"category": "Электроника", "price": 1000}'
# => {"error":"Поле \"title\" обязательно и должно быть непустой строкой"}  Status: 400
```

### PUT /listings/:id — полное обновление
```bash
curl -s -X PUT http://localhost:3000/listings/2 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Зимняя куртка The North Face, размер L",
    "description": "Цена снижена, торг уместен",
    "category": "Одежда",
    "price": 2800,
    "condition": "used",
    "status": "reserved"
  }'
```

### DELETE /listings/:id — удаление
```bash
curl -s -X DELETE http://localhost:3000/listings/3
```

### DELETE /listings/:id — повторное удаление (404)
```bash
curl -s -w "\nStatus: %{http_code}\n" -X DELETE http://localhost:3000/listings/3
# => {"error":"Listing not found"}  Status: 404
```

## Формат ошибок

Все ошибки API возвращаются в едином формате:
```json
{ "error": "текст сообщения" }
```

## Структура проекта

```
listings-api/
├── server.js                 # точка входа, конфигурация Express
├── routes/listings.js        # маршруты ресурса listings
├── controllers/
│   └── listingsController.js # обработка запросов, валидация
├── models/
│   └── listingsModel.js      # in-memory "база данных" + доступ к ней
├── middleware/
│   └── errorHandler.js       # глобальный error-handling middleware
├── postman_collection.json   # готовая коллекция для Postman
└── README.md
```

## Дальнейшее развитие (следующие лабораторные работы)

- Подключение реальной базы данных вместо in-memory массива
- JWT-аутентификация пользователей
- Реализация чата между покупателем и продавцом (WebSocket)
- Интеграция сервера с React-фронтендом (из 1 части курса)
