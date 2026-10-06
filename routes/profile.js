const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, authController.getProfile);

module.exports = router;