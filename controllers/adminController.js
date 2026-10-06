const { User } = require('../models');

exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.status(200).json(users.map((u) => u.toSafeObject()));
  } catch (err) {
    next(err);
  }
};