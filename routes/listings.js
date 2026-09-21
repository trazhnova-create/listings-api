
const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');

router.get('/', listingsController.getAllListings);

router.get('/:id', listingsController.getListingById);

router.post('/', listingsController.createListing);

router.put('/:id', listingsController.updateListing);

router.delete('/:id', listingsController.deleteListing);

module.exports = router;
