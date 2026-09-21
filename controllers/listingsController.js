
const listingsModel = require('../models/listingsModel');

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

  if (data.condition !== undefined) {
    const allowed = ['new', 'used', 'for_parts'];
    if (!allowed.includes(data.condition)) {
      errors.push(`Поле "condition" должно быть одним из: ${allowed.join(', ')}`);
    }
  }

  if (data.status !== undefined) {
    const allowed = ['available', 'reserved', 'sold'];
    if (!allowed.includes(data.status)) {
      errors.push(`Поле "status" должно быть одним из: ${allowed.join(', ')}`);
    }
  }

  return errors;
}

exports.getAllListings = (req, res, next) => {
  try {
    const { category, status, dealType } = req.query;
    const listings = listingsModel.getAll({ category, status, dealType });
    res.status(200).json(listings);
  } catch (err) {
    next(err);
  }
};

exports.getListingById = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Параметр "id" должен быть числом' });
    }

    const listing = listingsModel.getById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.status(200).json(listing);
  } catch (err) {
    next(err);
  }
};

exports.createListing = (req, res, next) => {
  try {
    const errors = validateListingInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const newListing = listingsModel.create(req.body);
    res.status(201).json(newListing);
  } catch (err) {
    next(err);
  }
};

exports.updateListing = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Параметр "id" должен быть числом' });
    }

    const errors = validateListingInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const updated = listingsModel.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

exports.deleteListing = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Параметр "id" должен быть числом' });
    }

    const deleted = listingsModel.remove(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.status(200).json({ message: 'Listing deleted successfully', listing: deleted });
  } catch (err) {
    next(err);
  }
};
