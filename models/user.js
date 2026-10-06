'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    toSafeObject() {
      const { id, email, role, createdAt } = this;
      return { id, email, role, createdAt };
    }
  }

  User.init({
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Некорректный email' },
        notEmpty: { msg: 'Поле email обязательно' },
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'user',
      validate: { isIn: [['user', 'admin']] },
    },
  }, {
    sequelize,
    modelName: 'User',
  });

  return User;
};