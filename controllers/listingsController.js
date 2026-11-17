const db = require('../db');


const ALLOWED_FIELDS = [
  'title', 'description', 'category', 'price',
  'condition', 'status', 'image', 'tags', 'location',
];
const CONDITIONS = ['new', 'used', 'for_parts'];
const STATUSES = ['available', 'reserved', 'sold'];
const MAX_PRICE = 99_999_999; 

const pickAllowed = (body) =>
  Object.fromEntries(Object.entries(body).filter(([key]) => ALLOWED_FIELDS.includes(key)));


const canModify = (listing, user) =>
  user.role === 'admin' || String(listing.sellerId) === String(user.id);

function validateListingInput(data, { partial = false } = {}) {
  const errors = [];
  const isText = (v) => typeof v === 'string' && v.trim() !== '';

  if (!partial || data.title !== undefined) {
    if (!isText(data.title)) errors.push('Поле "title" обязательно и должно быть непустой строкой');
  }

  if (!partial || data.category !== undefined) {
    if (!isText(data.category)) errors.push('Поле "category" обязательно и должно быть непустой строкой');
  }

  if (data.price !== undefined) {
    if (typeof data.price !== 'number' || Number.isNaN(data.price) || data.price < 0 || data.price > MAX_PRICE) {
      errors.push(`Поле "price" должно быть числом от 0 до ${MAX_PRICE}`);
    }
  }

  if (data.condition !== undefined && !CONDITIONS.includes(data.condition)) {
    errors.push(`Поле "condition" должно быть одним из: ${CONDITIONS.join(', ')}`);
  }

  if (data.status !== undefined && !STATUSES.includes(data.status)) {
    errors.push(`Поле "status" должно быть одним из: ${STATUSES.join(', ')}`);
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== 'string')) {
      errors.push('Поле "tags" должно быть массивом строк');
    }
  }

  if (data.location !== undefined) {
    const loc = data.location;
    const ok =
      loc && typeof loc === 'object' && !Array.isArray(loc) &&
      Object.values(loc).every((v) => typeof v === 'string');
    if (!ok) errors.push('Поле "location" должно быть объектом со строковыми значениями (city, district)');
  }

  return errors;
}


function handleDbError(err, res, next) {
  const normalized = db.normalizeError(err);
  if (normalized) return res.status(normalized.status).json({ error: normalized.message });
  return next(err);
}



exports.getAllListings = async (req, res, next) => {
  try {
    const { category, status, dealType, search, tag, city, minPrice, maxPrice, sort } = req.query;
    const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const num = (v) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);

    const limit = Number(req.query.limit);
    const offset = Number(req.query.offset);

    const { rows, total } = await db.listings.findMany({
      category: text(category),
      status: text(status),
      dealType: text(dealType),
      tag: text(tag),
      city: text(city),
      search: text(search),
      minPrice: num(minPrice),
      maxPrice: num(maxPrice),
      sort: typeof sort === 'string' ? sort : 'new',
      limit: limit > 0 ? Math.min(limit, 50) : 0,
      offset: offset > 0 ? offset : 0,
    });

    res.set('X-Total-Count', String(total)); 
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getListingById = async (req, res, next) => {
  try {
    
    const listing = await db.listings.viewById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.status(200).json(listing);
  } catch (err) {
    next(err);
  }
};

exports.createListing = async (req, res, next) => {
  try {
    const errors = validateListingInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    
    const listing = await db.listings.create({ ...pickAllowed(req.body), sellerId: req.user.id });
    res.status(201).json(listing);
  } catch (err) {
    handleDbError(err, res, next);
  }
};

exports.updateListing = async (req, res, next) => {
  try {
    const errors = validateListingInput(req.body, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const existing = await db.listings.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (!canModify(existing, req.user)) {
      return res.status(403).json({ error: 'Нельзя изменять чужое объявление' });
    }

    const listing = await db.listings.update(req.params.id, pickAllowed(req.body));
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.status(200).json(listing);
  } catch (err) {
    handleDbError(err, res, next);
  }
};

exports.deleteListing = async (req, res, next) => {
  try {
    const existing = await db.listings.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (!canModify(existing, req.user)) {
      return res.status(403).json({ error: 'Нельзя удалять чужое объявление' });
    }

    const deleted = await db.listings.remove(req.params.id);
    res.status(200).json({ message: 'Listing deleted successfully', listing: deleted });
  } catch (err) {
    next(err);
  }
};


exports.addComment = async (req, res, next) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'Текст комментария обязателен' });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: 'Комментарий не длиннее 500 символов' });
    }

    const comment = await db.listings.addComment(req.params.id, {
      userId: req.user.id,
      author: req.user.email,
      text,
    });
    if (!comment) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.status(201).json(comment);
  } catch (err) {
    handleDbError(err, res, next);
  }
};

exports.likeComment = async (req, res, next) => {
  try {
    const comment = await db.listings.likeComment(req.params.id, req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Объявление или комментарий не найдены' });
    }
    res.status(200).json(comment);
  } catch (err) {
    next(err);
  }
};


exports.deleteComment = async (req, res, next) => {
  try {
    const listing = await db.listings.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const comment = listing.comments.find((c) => c.id === req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    const isAuthor = String(comment.userId) === String(req.user.id);
    if (!isAuthor && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нельзя удалять чужой комментарий' });
    }

    await db.listings.removeComment(req.params.id, req.params.commentId);
    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (err) {
    next(err);
  }
};