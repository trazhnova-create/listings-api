'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Listing extends Model {}

  Listing.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Поле title обязательно' } },
    },
    description: DataTypes.TEXT,
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Поле category обязательно' } },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: { min: { args: [0], msg: 'Цена не может быть отрицательной' } },
    },
    dealType: {
      type: DataTypes.STRING,
      validate: { isIn: [['sale', 'exchange']] },
    },
    condition: {
      type: DataTypes.STRING,
      defaultValue: 'used',
      validate: { isIn: [['new', 'used', 'for_parts']] },
    },
    sellerId: DataTypes.INTEGER,
    status: {
      type: DataTypes.STRING,
      defaultValue: 'available',
      validate: { isIn: [['available', 'reserved', 'sold']] },
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'Listing',
    hooks: {
      beforeValidate: (listing) => {
        listing.dealType = Number(listing.price) > 0 ? 'sale' : 'exchange';
      },
    },
  });

  return Listing;
};