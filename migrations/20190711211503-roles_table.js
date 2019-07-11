'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('roles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING(25),
        unique: true
      },
      remark: {
        allowNull: false,
        type: Sequelize.STRING(256)
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('roles');
  }
};
