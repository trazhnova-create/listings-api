const { Sequelize, DataTypes } = require('sequelize');

function createSequelize() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL не задан в .env');
  return new Sequelize(url, { dialect: 'postgres', logging: false });
}

function defineModels(sequelize) {
  const User = sequelize.define(
    'User',
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: 'Некорректный email' },
          notEmpty: { msg: 'Поле email обязательно' },
        },
      },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user',
        validate: { isIn: { args: [['user', 'admin']], msg: 'Недопустимая роль' } },
      },
    },
    { tableName: 'Users' }
  );

  const Listing = sequelize.define(
    'Listing',
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: 'Поле title обязательно' } },
      },
      description: { type: DataTypes.TEXT, defaultValue: '' },
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
        validate: { isIn: { args: [['sale', 'exchange']], msg: 'Недопустимый тип сделки' } },
      },
      condition: {
        type: DataTypes.STRING,
        defaultValue: 'used',
        validate: { isIn: { args: [['new', 'used', 'for_parts']], msg: 'Недопустимое состояние' } },
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'available',
        validate: { isIn: { args: [['available', 'reserved', 'sold']], msg: 'Недопустимый статус' } },
      },
      image: { type: DataTypes.TEXT, defaultValue: '' },
      viewsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      sellerId: DataTypes.INTEGER,
      
      tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
      city: { type: DataTypes.STRING, defaultValue: '' },
      district: { type: DataTypes.STRING, defaultValue: '' },
      comments: { type: DataTypes.JSONB, defaultValue: [] },
    },
    {
      tableName: 'Listings',
      hooks: {
       
        beforeValidate: (listing) => {
          listing.dealType = Number(listing.price) > 0 ? 'sale' : 'exchange';
        },
      },
      indexes: [{ fields: ['category', 'price'] }],
    }
  );

  const Conversation = sequelize.define(
    'Conversation',
    {
      listingId: { type: DataTypes.INTEGER, allowNull: false },
      listingTitle: { type: DataTypes.STRING, allowNull: false },
      sellerId: { type: DataTypes.INTEGER, allowNull: false },
      sellerEmail: { type: DataTypes.STRING, allowNull: false },
      buyerId: { type: DataTypes.INTEGER, allowNull: false },
      buyerEmail: { type: DataTypes.STRING, allowNull: false },
      lastText: { type: DataTypes.STRING, defaultValue: '' },
      lastAt: DataTypes.DATE,
      unreadSeller: { type: DataTypes.INTEGER, defaultValue: 0 },
      unreadBuyer: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    {
      tableName: 'Conversations',
      indexes: [
        { unique: true, fields: ['listingId', 'buyerId'] },
        { fields: ['sellerId', 'updatedAt'] },
        { fields: ['buyerId', 'updatedAt'] },
      ],
    }
  );

  const Message = sequelize.define(
    'Message',
    {
      conversationId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      author: { type: DataTypes.STRING, allowNull: false },
      text: {
        type: DataTypes.STRING(1000),
        allowNull: false,
        validate: { len: { args: [1, 1000], msg: 'Сообщение от 1 до 1000 символов' } },
      },
    },
    {
      tableName: 'Messages',
      updatedAt: false,
      indexes: [{ fields: ['conversationId', 'createdAt'] }],
    }
  );

  return { User, Listing, Conversation, Message };
}

module.exports = { createSequelize, defineModels };