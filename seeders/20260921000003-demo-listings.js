'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('Listings', [
      {
        title: 'iPhone 12, 128GB',
        description: 'Небольшие царапины на корпусе, всё работает исправно.',
        category: 'Электроника',
        price: 25000,
        dealType: 'sale',
        condition: 'used',
        sellerId: 1,
        status: 'available',
        viewsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Зимняя куртка The North Face, размер L',
        description: 'Носилась один сезон, состояние отличное.',
        category: 'Одежда',
        price: 3500,
        dealType: 'sale',
        condition: 'used',
        sellerId: 2,
        status: 'available',
        viewsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Книжный шкаф ИКЕА Billy',
        description: 'Обмен на письменный стол.',
        category: 'Мебель',
        price: 0,
        dealType: 'exchange',
        condition: 'used',
        sellerId: 3,
        status: 'available',
        viewsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'PlayStation 4',
        description: 'В комплекте 2 геймпада и 3 диска.',
        category: 'Электроника',
        price: 15000,
        dealType: 'sale',
        condition: 'used',
        sellerId: 1,
        status: 'reserved',
        viewsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Listings', null, {});
  },
};