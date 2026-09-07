// middleware/errorHandler.js
// Глобальный error-handling middleware. Express распознаёт его по 4 аргументам.
// Ловит все непредвиденные ошибки, которые попали в next(err) из контроллеров.

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
  });
}

module.exports = errorHandler;
