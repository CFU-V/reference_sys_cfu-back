'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('categories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      title: {
        allowNull: false,
        type: Sequelize.STRING(256),
        unique: true
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('categories');
  }
};
