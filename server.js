require('dotenv').config();
const express = require('express');
const listingsRouter = require('./routes/listings');
const errorHandler = require('./middleware/errorHandler');
const { sequelize } = require('./models');   // ← добавить

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Listings API is running',
    endpoints: {
      listings: '/listings',
    },
  });
});

app.use('/listings', listingsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  sequelize.authenticate()               // ← добавить
    .then(() => console.log('Database connection established'))
    .catch((err) => console.error('Unable to connect to the database:', err));
});