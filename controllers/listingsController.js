
const { Listing } = require('../models');


const ALLOWED_FIELDS = [
  'title', 'description', 'category', 'price',
  'condition', 'status', 'image', 'tags', 'location',
];

const pickAllowed = (body) =>
  Object.fromEntries(Object.entries(body).filter(([key]) => ALLOWED_FIELDS.includes(key)));


const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function validateListingInput(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      errors.push('Поле "title" обязательно и должно быть непустой строкой');
    }
  }

  if (!partial || data.category !== undefined) {
    if (!data.category || typeof data.category !== 'string' || !data.category.trim()) {
      errors.push('Поле "category" обязательно и должно быть непустой строкой');
    }
  }

  if (data.price !== undefined) {
    if (typeof data.price !== 'number' || Number.isNaN(data.price) || data.price < 0) {
      errors.push('Поле "price" должно быть числом >= 0');
    }
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== 'string')) {
      errors.push('Поле "tags" должно быть массивом строк');
    }
  }

  return errors;
}


function handleDbError(err, res, next) {
  if (err.name === 'ValidationError') {
    return res
      .status(400)
      .json({ error: Object.values(err.errors).map((e) => e.message).join('; ') });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Некорректное значение поля "${err.path}"` });
  }
  return next(err);
}



exports.getAllListings = async (req, res, next) => {
  try {
    const { category, status, dealType, search, tag, city, minPrice, maxPrice, sort } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (dealType) filter.dealType = dealType;

    
    if (tag) filter.tags = tag;

    
    if (city) filter['location.city'] = city;

    
    if (search && search.trim()) {
      filter.title = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

   
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (minPrice && Number.isFinite(min)) filter.price = { ...filter.price, $gte: min };
    if (maxPrice && Number.isFinite(max)) filter.price = { ...filter.price, $lte: max };

    const sorts = {
      new: { createdAt: -1, _id: -1 },
      old: { createdAt: 1, _id: 1 },
      priceAsc: { price: 1, _id: -1 },
      priceDesc: { price: -1, _id: -1 },
    };

    
    let query = Listing.find(filter).sort(sorts[sort] || sorts.new);

    
    const limit = Number(req.query.limit);
    if (limit > 0) {
      query = query.skip(Number(req.query.offset) || 0).limit(Math.min(limit, 50));
    }

    const [rows, total] = await Promise.all([query.exec(), Listing.countDocuments(filter)]);

    res.set('X-Total-Count', String(total)); // сколько всего подходит под фильтры
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getListingById = async (req, res, next) => {
  try {
    
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    );
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

    
    const listing = await Listing.create({ ...pickAllowed(req.body), sellerId: req.user.id });
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

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (!listing.canBeModifiedBy(req.user)) {
      return res.status(403).json({ error: 'Нельзя изменять чужое объявление' });
    }

    
    listing.set(pickAllowed(req.body));
    await listing.save();
    res.status(200).json(listing);
  } catch (err) {
    handleDbError(err, res, next);
  }
};

exports.deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (!listing.canBeModifiedBy(req.user)) {
      return res.status(403).json({ error: 'Нельзя удалять чужое объявление' });
    }

    
    const deleted = await Listing.findByIdAndDelete(req.params.id);
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

    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { userId: req.user.id, author: req.user.email, text } } },
      { new: true, runValidators: true }
    );
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.status(201).json(listing.comments[listing.comments.length - 1]);
  } catch (err) {
    handleDbError(err, res, next);
  }
};


exports.likeComment = async (req, res, next) => {
  try {
    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.id, 'comments._id': req.params.commentId },
      { $inc: { 'comments.$.likes': 1 } },
      { new: true }
    );
    if (!listing) {
      return res.status(404).json({ error: 'Объявление или комментарий не найдены' });
    }

    res.status(200).json(listing.comments.id(req.params.commentId));
  } catch (err) {
    next(err);
  }
};


exports.deleteComment = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const comment = listing.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    const isAuthor = String(comment.userId) === String(req.user.id);
    if (!isAuthor && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нельзя удалять чужой комментарий' });
    }

    await Listing.updateOne({ _id: listing._id }, { $pull: { comments: { _id: comment._id } } });
    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (err) {
    next(err);
  }
};