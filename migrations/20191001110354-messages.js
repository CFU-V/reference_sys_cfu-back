'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      text: {
        allowNull: false,
        type: Sequelize.STRING(6000),
      },
      authorId: {
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        type: Sequelize.BIGINT,
      },
      recipientId: {
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        type: Sequelize.BIGINT,
      },
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('messages');
  }
};
