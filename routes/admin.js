const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.get('/users', authenticate, isAdmin, adminController.listUsers);

module.exports = router;