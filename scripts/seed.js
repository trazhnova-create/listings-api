require('dotenv').config();
const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']); // обход проблем с SRV/TXT-запросами у провайдера
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { Listing, User } = require('../models');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Listing.deleteMany({}), User.deleteMany({})]);

  const admin = await User.create({
    email: 'admin@listings.local',
    passwordHash: await bcrypt.hash('Admin12345!', 10),
    role: 'admin',
  });
  const seller = await User.create({
    email: 'seller@test.com',
    passwordHash: await bcrypt.hash('MyPass123', 10),
  });

  await Listing.create([
    {
      title: 'iPhone 12, 128GB',
      description: 'Небольшие царапины на корпусе, всё работает исправно.',
      category: 'Электроника',
      price: 25000,
      sellerId: admin._id,
      tags: ['телефон', 'apple'],
      location: { city: 'Минск', district: 'Центральный' },
      comments: [
        { userId: seller._id, author: seller.email, text: 'Торг уместен?', likes: 2 },
        { userId: admin._id, author: admin.email, text: 'Немного уступлю', likes: 0 },
      ],
    },
    {
      title: 'Зимняя куртка The North Face, размер L',
      description: 'Носилась один сезон, состояние отличное.',
      category: 'Одежда',
      price: 3500,
      sellerId: seller._id,
      tags: ['куртка', 'зима'],
      location: { city: 'Гомель', district: '' },
    },
    {
      title: 'Книжный шкаф ИКЕА Billy',
      description: 'Обмен на письменный стол.',
      category: 'Мебель',
      price: 0,
      sellerId: seller._id,
      tags: ['шкаф', 'ikea'],
      location: { city: 'Минск', district: 'Заводской' },
    },
    {
      title: 'PlayStation 4',
      description: 'В комплекте 2 геймпада и 3 диска.',
      category: 'Электроника',
      price: 15000,
      status: 'reserved',
      sellerId: admin._id,
      tags: ['приставка', 'игры'],
      location: { city: 'Брест', district: '' },
    },
  ]);

  console.log('Seed выполнен: 2 пользователя, 4 объявления');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});