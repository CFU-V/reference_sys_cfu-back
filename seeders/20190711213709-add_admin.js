'use strict';
const bcrypt = require("bcrypt");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('users', [{
      login: 'admin',
      password: bcrypt.hashSync("admin", 10),
      roleId: 1,
      lastName: 'Admin',
      firstName: 'Admin',
      surName: 'Admin',
      email: 'admin@admin.com',
      birthDate: new Date(1960, 1, 1),
      position: 'Admin',
      phone: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('users', null, {});
  }
};
