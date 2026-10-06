'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('Admin12345!', 10);

    await queryInterface.bulkInsert('Users', [
      {
        email: 'admin@listings.local',
        passwordHash,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', { email: 'admin@listings.local' }, {});
  },
};