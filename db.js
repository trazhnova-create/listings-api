const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']); // обход проблем с SRV/TXT-запросами у провайдера
const mongoose = require('mongoose');


async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI не задан в .env');

  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

module.exports = connectDB;