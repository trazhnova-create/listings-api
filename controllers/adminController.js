const db = require('../db');

exports.listUsers = async (req, res, next) => {
  try {
    const users = await db.users.list();
    res.status(200).json(
      users.map(({ id, email, role, createdAt }) => ({ id, email, role, createdAt }))
    );
  } catch (err) {
    next(err);
  }
};