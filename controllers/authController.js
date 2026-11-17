const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const SALT_ROUNDS = 10;
const EMAIL_RE = /^\S+@\S+\.\S+$/;


const toSafe = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'Поля email и password обязательны' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
    }
    if (password.length > 72) {
      
      return res.status(400).json({ error: 'Пароль не длиннее 72 символов' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 254) {
      return res.status(400).json({ error: 'Некорректный email' });
    }

    const existing = await db.users.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await db.users.create({ email: normalizedEmail, passwordHash });

    res.status(201).json(toSafe(user));
  } catch (err) {
    const normalized = db.normalizeError(err);
    if (normalized?.duplicate) {
      
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }
    if (normalized) return res.status(normalized.status).json({ error: normalized.message });
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'Поля email и password обязательны' });
    }

    const user = await db.users.findByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token, user: toSafe(user) });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await db.users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.status(200).json(toSafe(user));
  } catch (err) {
    next(err);
  }
};