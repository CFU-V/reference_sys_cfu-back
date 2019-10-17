'use strict';
const bcrypt = require("bcrypt");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('users', [{
      login: 'admin',
      password: bcrypt.hashSync("admin", 10),
      roleId: 1,
      lastName: 'Администратор',
      firstName: 'Администратор',
      surName: 'Администратор',
      email: 'admin@admin.com',
      birthDate: new Date(1960, 1, 1),
      position: 'Администратор',
      phone: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('users', null, {});
  }
};
