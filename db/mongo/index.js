// Реализация слоя данных на MongoDB + Mongoose.

const dns = require('node:dns');
const mongoose = require('mongoose');
const { Listing, User, Conversation, Message } = require('./models');

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
const isValidId = (id) => typeof id === 'string' && OBJECT_ID_RE.test(id);

// Экранируем спецсимволы, чтобы поиск воспринимал ввод как обычный текст
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v) => (v === null || v === undefined ? v : String(v));

// ---------- Подключение ----------

async function connect() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI не задан в .env');

  // обход проблем с SRV/TXT-запросами у некоторых провайдеров (нужно только для Atlas, mongodb+srv://)
  if (uri.startsWith('mongodb+srv')) dns.setServers(['1.1.1.1', '8.8.8.8']);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('MongoDB connected');
}

async function isHealthy() {
  return mongoose.connection.readyState === 1;
}

// ---------- Ошибки Mongoose -> единый вид ----------

function normalizeError(err) {
  if (err.name === 'ValidationError') {
    return { status: 400, message: Object.values(err.errors).map((e) => e.message).join('; ') };
  }
  if (err.name === 'CastError') {
    return { status: 400, message: `Некорректное значение поля "${err.path}"` };
  }
  if (err.code === 11000) {
    return { status: 400, message: 'Такая запись уже существует', duplicate: true };
  }
  return null;
}

// ---------- Преобразование документов в простые объекты ----------

function plainUser(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    email: doc.email,
    passwordHash: doc.passwordHash,
    role: doc.role,
    createdAt: doc.createdAt,
  };
}

function plainComment(c) {
  return {
    id: str(c._id),
    userId: str(c.userId),
    author: c.author,
    text: c.text,
    likes: c.likes,
    createdAt: c.createdAt,
  };
}

function plainListing(doc) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc.toObject();
  return {
    ...rest,
    id: str(_id),
    sellerId: str(rest.sellerId),
    comments: (rest.comments || []).map(plainComment),
  };
}

function plainConversation(c) {
  if (!c) return null;
  return {
    id: c.id,
    listingId: str(c.listingId),
    listingTitle: c.listingTitle,
    sellerId: str(c.sellerId),
    sellerEmail: c.sellerEmail,
    buyerId: str(c.buyerId),
    buyerEmail: c.buyerEmail,
    lastText: c.lastText,
    lastAt: c.lastAt,
    unreadSeller: c.unreadSeller,
    unreadBuyer: c.unreadBuyer,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function plainMessage(m) {
  if (!m) return null;
  return {
    id: m.id,
    conversationId: str(m.conversationId),
    userId: str(m.userId),
    author: m.author,
    text: m.text,
    createdAt: m.createdAt,
  };
}

// ---------- Пользователи ----------

const users = {
  async findByEmail(email) {
    return plainUser(await User.findOne({ email }));
  },
  async findById(id) {
    if (!isValidId(String(id))) return null;
    return plainUser(await User.findById(id));
  },
  async create({ email, passwordHash, role }) {
    return plainUser(await User.create({ email, passwordHash, ...(role ? { role } : {}) }));
  },
  async list() {
    return (await User.find().sort({ createdAt: 1 })).map(plainUser);
  },
  async removeAll() {
    await User.deleteMany({});
  },
};

// ---------- Объявления ----------

const SORTS = {
  new: { createdAt: -1, _id: -1 },
  old: { createdAt: 1, _id: 1 },
  priceAsc: { price: 1, _id: -1 },
  priceDesc: { price: -1, _id: -1 },
};

const listings = {
  // filters: category, status, dealType, search, tag, city, minPrice, maxPrice, sort, limit, offset
  async findMany(f) {
    const filter = {};
    if (f.category) filter.category = f.category;
    if (f.status) filter.status = f.status;
    if (f.dealType) filter.dealType = f.dealType;
    if (f.tag) filter.tags = f.tag; // массив содержит значение
    if (f.city) filter['location.city'] = f.city; // поиск по вложенному полю
    if (f.search) filter.title = { $regex: escapeRegex(f.search), $options: 'i' };
    if (f.minPrice !== undefined) filter.price = { ...filter.price, $gte: f.minPrice };
    if (f.maxPrice !== undefined) filter.price = { ...filter.price, $lte: f.maxPrice };

    let query = Listing.find(filter).sort(SORTS[f.sort] || SORTS.new);
    if (f.limit > 0) query = query.skip(f.offset || 0).limit(f.limit);

    const [rows, total] = await Promise.all([query.exec(), Listing.countDocuments(filter)]);
    return { rows: rows.map(plainListing), total };
  },

  async findById(id) {
    return plainListing(await Listing.findById(id));
  },

  // $inc атомарно увеличивает счётчик просмотров и сразу возвращает документ
  async viewById(id) {
    return plainListing(await Listing.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } }, { new: true }));
  },

  async create(data) {
    return plainListing(await Listing.create(data));
  },

  // save() запускает валидацию схемы и хук pre('validate') (пересчёт dealType)
  async update(id, data) {
    const doc = await Listing.findById(id);
    if (!doc) return null;
    doc.set(data);
    await doc.save();
    return plainListing(doc);
  },

  async remove(id) {
    return plainListing(await Listing.findByIdAndDelete(id));
  },

  async createMany(items) {
    return (await Listing.create(items)).map(plainListing);
  },

  async removeAll() {
    await Listing.deleteMany({});
  },

  // --- Комментарии (массив вложенных документов) ---

  // $push: добавить элемент в массив. Возвращает созданный комментарий или null, если объявления нет
  async addComment(id, { userId, author, text }) {
    const doc = await Listing.findByIdAndUpdate(
      id,
      { $push: { comments: { userId, author, text } } },
      { new: true, runValidators: true }
    );
    if (!doc) return null;
    return plainComment(doc.comments[doc.comments.length - 1]);
  },

  // позиционный оператор $: изменить найденный элемент массива
  async likeComment(id, commentId) {
    const doc = await Listing.findOneAndUpdate(
      { _id: id, 'comments._id': commentId },
      { $inc: { 'comments.$.likes': 1 } },
      { new: true }
    );
    if (!doc) return null;
    return plainComment(doc.comments.id(commentId));
  },

  // $pull: удалить элемент массива
  async removeComment(id, commentId) {
    await Listing.updateOne({ _id: id }, { $pull: { comments: { _id: commentId } } });
  },
};

// ---------- Диалоги ----------

const conversations = {
  async listForUser(userId) {
    const rows = await Conversation.find({
      $or: [{ sellerId: userId, lastAt: { $ne: null } }, { buyerId: userId }],
    })
      .sort({ updatedAt: -1 })
      .limit(100);
    return rows.map(plainConversation);
  },

  async findById(id) {
    return plainConversation(await Conversation.findById(id));
  },

  async removeAll() {
    await Conversation.deleteMany({});
  },

  // Находит диалог по (объявление, покупатель) или создаёт. Гонка двух вкладок решена уникальным индексом.
  async findOrCreate({ listingId, buyerId }, data) {
    const existing = await Conversation.findOne({ listingId, buyerId });
    if (existing) return plainConversation(existing);
    try {
      return plainConversation(await Conversation.create({ ...data, listingId, buyerId }));
    } catch (err) {
      if (err.code !== 11000) throw err;
      return plainConversation(await Conversation.findOne({ listingId, buyerId }));
    }
  },

  // role: 'seller' | 'buyer'. updatedAt не меняем, чтобы диалог не «прыгал» вверх списка
  async resetUnread(id, role) {
    const field = role === 'seller' ? 'unreadSeller' : 'unreadBuyer';
    await Conversation.updateOne({ _id: id }, { [field]: 0 }, { timestamps: false });
  },

  // Новое сообщение: обновляем превью; unreadFor ('seller' | 'buyer' | null) — кому +1 непрочитанное
  async touch(id, { text, at, unreadFor }) {
    const update = { $set: { lastText: text, lastAt: at } };
    if (unreadFor) update.$inc = { [unreadFor === 'seller' ? 'unreadSeller' : 'unreadBuyer']: 1 };
    return plainConversation(await Conversation.findByIdAndUpdate(id, update, { new: true }));
  },
};

// ---------- Сообщения ----------

const messages = {
  async removeAll() {
    await Message.deleteMany({});
  },

  async create({ conversationId, userId, author, text }) {
    return plainMessage(await Message.create({ conversationId, userId, author, text }));
  },

  // последние N сообщений, от старых к новым
  async history(conversationId, limit = 50) {
    const rows = await Message.find({ conversationId }).sort({ createdAt: -1 }).limit(limit);
    return rows.reverse().map(plainMessage);
  },
};

module.exports = { connect, isHealthy, isValidId, normalizeError, users, listings, conversations, messages };