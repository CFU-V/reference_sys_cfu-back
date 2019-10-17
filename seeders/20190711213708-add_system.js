'use strict';
const bcrypt = require("bcrypt");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('users', [{
      login: 'system',
      password: bcrypt.hashSync("enr_2130)43234_1qwwe", 10),
      roleId: 1,
      lastName: 'Система',
      firstName: '',
      surName: '',
      email: 'system@system.com',
      birthDate: new Date(1960, 1, 1),
      position: 'Система',
      phone: '12',
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('users', null, {});
  }
};
