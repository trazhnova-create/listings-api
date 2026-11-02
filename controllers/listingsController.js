// controllers/listingsController.js
const { Op } = require('sequelize');
const { Listing } = require('../models');

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

  return errors;
}


function canModify(listing, user) {
  return user.role === 'admin' || listing.sellerId === user.id;
}

exports.getAllListings = async (req, res, next) => {
  try {
    const { category, status, dealType, search, minPrice, maxPrice, sort } = req.query;
    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (dealType) where.dealType = dealType;

    
    if (search && search.trim()) {
      where.title = { [Op.iLike]: `%${search.trim()}%` };
    }

    // диапазон цены
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (minPrice && Number.isFinite(min)) where.price = { ...where.price, [Op.gte]: min };
    if (maxPrice && Number.isFinite(max)) where.price = { ...where.price, [Op.lte]: max };

    const orders = {
      new: [['id', 'DESC']],
      old: [['id', 'ASC']],
      priceAsc: [['price', 'ASC'], ['id', 'DESC']],
      priceDesc: [['price', 'DESC'], ['id', 'DESC']],
    };
    const options = { where, order: orders[sort] || orders.new };

    
    const limit = Number(req.query.limit);
    if (limit > 0) {
      options.limit = Math.min(limit, 50);
      options.offset = Number(req.query.offset) || 0;
    }

    const { count, rows } = await Listing.findAndCountAll(options);
    res.set('X-Total-Count', String(count)); 
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getListingById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Параметр "id" должен быть числом' });
    }

    const listing = await Listing.findByPk(id);
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

    
    const listing = await Listing.create({ ...req.body, sellerId: req.user.id });
    res.status(201).json(listing);
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join('; ') });
    }
    next(err);
  }
};

exports.updateListing = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Параметр "id" должен быть числом' });
    }

    const errors = validateListingInput(req.body, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const listing = await Listing.findByPk(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!canModify(listing, req.user)) {
      return res.status(403).json({ error: 'Нельзя изменять чужое объявление' });
    }

    
    const { id: _id, sellerId: _sellerId, ...changes } = req.body;
    await listing.update(changes);
    res.status(200).json(listing);
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join('; ') });
    }
    next(err);
  }
};

exports.deleteListing = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Параметр "id" должен быть числом' });
    }

    const listing = await Listing.findByPk(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!canModify(listing, req.user)) {
      return res.status(403).json({ error: 'Нельзя удалять чужое объявление' });
    }

    await listing.destroy();
    res.status(200).json({ message: 'Listing deleted successfully', listing });
  } catch (err) {
    next(err);
  }
};