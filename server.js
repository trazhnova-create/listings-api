// server.js
// Точка входа серверного приложения.
// Платформа для продажи и обмена подержанными вещами — REST API для объявлений (listings).

const express = require('express');
const listingsRouter = require('./routes/listings');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON-тела запросов
app.use(express.json());

// Простой лог входящих запросов — удобно при тестировании
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Корневой маршрут — для быстрой проверки, что сервер жив
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Listings API is running',
    endpoints: {
      listings: '/listings',
    },
  });
});

// Основные маршруты ресурса
app.use('/listings', listingsRouter);

// 404 для всех остальных путей, не подошедших ни под один маршрут
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Глобальный обработчик ошибок (должен быть последним app.use)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
