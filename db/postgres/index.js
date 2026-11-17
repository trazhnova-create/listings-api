const { Op } = require('sequelize');
const crypto = require('node:crypto');
const { createSequelize, defineModels } = require('./models');

const sequelize = createSequelize();
const { User, Listing, Conversation, Message } = defineModels(sequelize);


const isValidId = (id) => typeof id === 'string' && /^\d{1,9}$/.test(id);

const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');
const str = (v) => (v === null || v === undefined ? v : String(v));



async function connect() {
  await sequelize.authenticate();
    await sequelize.sync();

  
  const addColumn = (name, ddl) =>
    sequelize.query(`ALTER TABLE "Listings" ADD COLUMN IF NOT EXISTS "${name}" ${ddl}`);
  await addColumn('tags', `VARCHAR(255)[] DEFAULT '{}'`);
  await addColumn('city', `VARCHAR(255) DEFAULT ''`);
  await addColumn('district', `VARCHAR(255) DEFAULT ''`);
  await addColumn('comments', `JSONB DEFAULT '[]'::jsonb`);
  await addColumn('image', `TEXT DEFAULT ''`);

  console.log('PostgreSQL connected');
}

async function isHealthy() {
  try {
    await sequelize.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}



function normalizeError(err) {
  if (err.name === 'SequelizeValidationError') {
    return { status: 400, message: err.errors.map((e) => e.message).join('; ') };
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return { status: 400, message: 'Такая запись уже существует', duplicate: true };
  }
  
  const code = err.original?.code || err.parent?.code;
  if (err.name === 'SequelizeDatabaseError' && (code === '22P02' || code === '22003')) {
    return { status: 400, message: 'Некорректное значение в запросе' };
  }
  return null;
}



function plainUser(row) {
  if (!row) return null;
  return {
    id: str(row.id),
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    createdAt: row.createdAt,
  };
}

function plainListing(row) {
  if (!row) return null;
  return {
    id: str(row.id),
    title: row.title,
    description: row.description || '',
    category: row.category,
    price: Number(row.price),     dealType: row.dealType,
    condition: row.condition,
    status: row.status,
    image: row.image || '',
    viewsCount: row.viewsCount,
    sellerId: str(row.sellerId),
    tags: row.tags || [],
    location: { city: row.city || '', district: row.district || '' },
    comments: row.comments || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function plainConversation(row) {
  if (!row) return null;
  return {
    id: str(row.id),
    listingId: str(row.listingId),
    listingTitle: row.listingTitle,
    sellerId: str(row.sellerId),
    sellerEmail: row.sellerEmail,
    buyerId: str(row.buyerId),
    buyerEmail: row.buyerEmail,
    lastText: row.lastText,
    lastAt: row.lastAt,
    unreadSeller: row.unreadSeller,
    unreadBuyer: row.unreadBuyer,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function plainMessage(row) {
  if (!row) return null;
  return {
    id: str(row.id),
    conversationId: str(row.conversationId),
    userId: str(row.userId),
    author: row.author,
    text: row.text,
    createdAt: row.createdAt,
  };
}


function toColumns(data) {
  const { location, ...rest } = data;
  if (location && typeof location === 'object') {
    if (location.city !== undefined) rest.city = location.city;
    if (location.district !== undefined) rest.district = location.district;
  }
  return rest;
}



const users = {
  async findByEmail(email) {
    return plainUser(await User.findOne({ where: { email } }));
  },
  async findById(id) {
    if (!isValidId(String(id))) return null;
    return plainUser(await User.findByPk(id));
  },
  async create({ email, passwordHash, role }) {
    return plainUser(await User.create({ email, passwordHash, ...(role ? { role } : {}) }));
  },
  async list() {
    return (await User.findAll({ order: [['createdAt', 'ASC'], ['id', 'ASC']] })).map(plainUser);
  },
  async removeAll() {
    await User.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true });
  },
};



const ORDERS = {
  new: [['createdAt', 'DESC'], ['id', 'DESC']],
  old: [['createdAt', 'ASC'], ['id', 'ASC']],
  priceAsc: [['price', 'ASC'], ['id', 'DESC']],
  priceDesc: [['price', 'DESC'], ['id', 'DESC']],
};


async function withCommentsLock(id, fn) {
  return sequelize.transaction(async (t) => {
    const row = await Listing.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!row) return null;
    const comments = [...(row.comments || [])];
    const result = fn(comments);
    if (result === undefined) return null; 
    await row.update({ comments }, { transaction: t });
    return result;
  });
}

const listings = {
  async findMany(f) {
    const where = {};
    if (f.category) where.category = f.category;
    if (f.status) where.status = f.status;
    if (f.dealType) where.dealType = f.dealType;
    if (f.tag) where.tags = { [Op.contains]: [f.tag] }; 
    if (f.city) where.city = f.city;
    if (f.search) where.title = { [Op.iLike]: `%${escapeLike(f.search)}%` };
    if (f.minPrice !== undefined || f.maxPrice !== undefined) {
      where.price = {};
      if (f.minPrice !== undefined) where.price[Op.gte] = f.minPrice;
      if (f.maxPrice !== undefined) where.price[Op.lte] = f.maxPrice;
    }

    const query = { where, order: ORDERS[f.sort] || ORDERS.new };
    if (f.limit > 0) {
      query.limit = f.limit;
      query.offset = f.offset || 0;
    }

    const [rows, total] = await Promise.all([Listing.findAll(query), Listing.count({ where })]);
    return { rows: rows.map(plainListing), total };
  },

  async findById(id) {
    if (!isValidId(String(id))) return null;
    return plainListing(await Listing.findByPk(id));
  },

  async viewById(id) {
    if (!isValidId(String(id))) return null;
    await Listing.increment('viewsCount', { by: 1, where: { id } });
    return plainListing(await Listing.findByPk(id));
  },

  async create(data) {
    return plainListing(await Listing.create(toColumns(data)));
  },

  
  async update(id, data) {
    if (!isValidId(String(id))) return null;
    const row = await Listing.findByPk(id);
    if (!row) return null;
    row.set(toColumns(data));
    await row.save();
    return plainListing(row);
  },

  async remove(id) {
    if (!isValidId(String(id))) return null;
    const row = await Listing.findByPk(id);
    if (!row) return null;
    const result = plainListing(row);
    await row.destroy();
    return result;
  },

  async createMany(items) {
    const created = [];
    for (const item of items) created.push(plainListing(await Listing.create(toColumns(item))));
    return created;
  },

  async removeAll() {
    await Listing.destroy({ where: {}, truncate: true, restartIdentity: true });
  },

  

  async addComment(id, { userId, author, text }) {
    if (!isValidId(String(id))) return null;
    return withCommentsLock(id, (comments) => {
      const comment = {
        id: crypto.randomUUID(),
        userId: str(userId),
        author,
        text,
        likes: 0,
        createdAt: new Date().toISOString(),
      };
      comments.push(comment);
      return comment;
    });
  },

  async likeComment(id, commentId) {
    if (!isValidId(String(id))) return null;
    return withCommentsLock(id, (comments) => {
      const idx = comments.findIndex((c) => c.id === commentId);
      if (idx === -1) return undefined;
      comments[idx] = { ...comments[idx], likes: (comments[idx].likes || 0) + 1 };
      return comments[idx];
    });
  },

  async removeComment(id, commentId) {
    if (!isValidId(String(id))) return;
    await withCommentsLock(id, (comments) => {
      const idx = comments.findIndex((c) => c.id === commentId);
      if (idx === -1) return undefined;
      comments.splice(idx, 1);
      return true;
    });
  },
};



const conversations = {
  async listForUser(userId) {
    const rows = await Conversation.findAll({
      where: {
        [Op.or]: [
          { sellerId: userId, lastAt: { [Op.ne]: null } },
          { buyerId: userId },
        ],
      },
      order: [['updatedAt', 'DESC']],
      limit: 100,
    });
    return rows.map(plainConversation);
  },

  async findById(id) {
    if (!isValidId(String(id))) return null;
    return plainConversation(await Conversation.findByPk(id));
  },

  async removeAll() {
    await Conversation.destroy({ where: {}, truncate: true, restartIdentity: true });
  },

  async findOrCreate({ listingId, buyerId }, data) {
    const find = () => Conversation.findOne({ where: { listingId, buyerId } });
    const existing = await find();
    if (existing) return plainConversation(existing);
    try {
      return plainConversation(await Conversation.create({ ...data, listingId, buyerId }));
    } catch (err) {
      if (err.name !== 'SequelizeUniqueConstraintError') throw err;
      return plainConversation(await find()); 
    }
  },

  
  async resetUnread(id, role) {
    const field = role === 'seller' ? 'unreadSeller' : 'unreadBuyer';
    await Conversation.update({ [field]: 0 }, { where: { id }, silent: true });
  },

  async touch(id, { text, at, unreadFor }) {
    const changes = { lastText: text, lastAt: at };
    if (unreadFor) {
      const field = unreadFor === 'seller' ? 'unreadSeller' : 'unreadBuyer';
      changes[field] = sequelize.literal(`"${field}" + 1`);
    }
    await Conversation.update(changes, { where: { id } });
    return plainConversation(await Conversation.findByPk(id));
  },
};



const messages = {
  async removeAll() {
    await Message.destroy({ where: {}, truncate: true, restartIdentity: true });
  },

  async create({ conversationId, userId, author, text }) {
    return plainMessage(await Message.create({ conversationId, userId, author, text }));
  },

  async history(conversationId, limit = 50) {
    const rows = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit,
    });
    return rows.reverse().map(plainMessage);
  },
};

module.exports = { connect, isHealthy, isValidId, normalizeError, users, listings, conversations, messages };