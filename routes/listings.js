// routes/listings.js
const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');

// GET /listings?category=&status=&dealType=  — список объявлений (с опциональной фильтрацией)
router.get('/', listingsController.getAllListings);

// GET /listings/:id — одно объявление по id
router.get('/:id', listingsController.getListingById);

// POST /listings — создать новое объявление
router.post('/', listingsController.createListing);

// PUT /listings/:id — полное обновление объявления
router.put('/:id', listingsController.updateListing);

// DELETE /listings/:id — удаление объявления
router.delete('/:id', listingsController.deleteListing);

module.exports = router;
