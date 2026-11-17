require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../db');

async function seed() {
  await db.connect();
  console.log(`Заполняю БД: ${db.type}`);

  
  await db.messages.removeAll();
  await db.conversations.removeAll();
  await db.listings.removeAll();
  await db.users.removeAll();

  const admin = await db.users.create({
    email: 'admin@listings.local',
    passwordHash: await bcrypt.hash('Admin12345!', 10),
    role: 'admin',
  });
  const seller = await db.users.create({
    email: 'seller@test.com',
    passwordHash: await bcrypt.hash('MyPass123', 10),
  });

  const [iphone] = await db.listings.createMany([
    {
      title: 'iPhone 12, 128GB',
      description: 'Небольшие царапины на корпусе, всё работает исправно.',
      category: 'Электроника',
      price: 25000,
      sellerId: admin.id,
      tags: ['телефон', 'apple'],
      location: { city: 'Минск', district: 'Центральный' },
    },
    {
      title: 'Зимняя куртка The North Face, размер L',
      description: 'Носилась один сезон, состояние отличное.',
      category: 'Одежда',
      price: 3500,
      sellerId: seller.id,
      tags: ['куртка', 'зима'],
      location: { city: 'Гомель', district: '' },
    },
    {
      title: 'Книжный шкаф ИКЕА Billy',
      description: 'Обмен на письменный стол.',
      category: 'Мебель',
      price: 0,
      sellerId: seller.id,
      tags: ['шкаф', 'ikea'],
      location: { city: 'Минск', district: 'Заводской' },
    },
    {
      title: 'PlayStation 4',
      description: 'В комплекте 2 геймпада и 3 диска.',
      category: 'Электроника',
      price: 15000,
      status: 'reserved',
      sellerId: admin.id,
      tags: ['приставка', 'игры'],
      location: { city: 'Брест', district: '' },
    },
  ]);

  
  const c1 = await db.listings.addComment(iphone.id, {
    userId: seller.id,
    author: seller.email,
    text: 'Торг уместен?',
  });
  await db.listings.likeComment(iphone.id, c1.id);
  await db.listings.likeComment(iphone.id, c1.id);
  await db.listings.addComment(iphone.id, {
    userId: admin.id,
    author: admin.email,
    text: 'Немного уступлю',
  });

  console.log('Seed выполнен: 2 пользователя, 4 объявления');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });