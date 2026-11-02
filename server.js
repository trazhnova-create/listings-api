require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const listingsRouter = require('./routes/listings');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const adminRouter = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  exposedHeaders: ['X-Total-Count'],
}));

app.use(express.json());


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


if (process.env.DELAY_MS) {
  app.use((req, res, next) => setTimeout(next, Number(process.env.DELAY_MS)));
}

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Listings API is running',
    endpoints: {
      listings: '/listings',
      auth: '/auth',
      profile: '/profile',
      admin: '/admin',
    },
  });
});

app.use('/listings', listingsRouter);
app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/admin', adminRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  sequelize.authenticate()
    .then(() => console.log('Database connection established'))
    .catch((err) => console.error('Unable to connect to the database:', err));
});