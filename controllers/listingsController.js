
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

exports.getAllListings = async (req, res, next) => {
  try {
    const { category, status, dealType } = req.query;
    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (dealType) where.dealType = dealType;

    const listings = await Listing.findAll({ where });
    res.status(200).json(listings);
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

    const listing = await Listing.create(req.body);
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

    await listing.update(req.body);
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

    await listing.destroy();
    res.status(200).json({ message: 'Listing deleted successfully', listing });
  } catch (err) {
    next(err);
  }
};