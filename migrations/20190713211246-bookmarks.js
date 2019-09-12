'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('bookmarks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        type: Sequelize.BIGINT,
      },
      docId: {
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'documents',
          key: 'id'
        },
        onDelete: 'CASCADE',
        type: Sequelize.BIGINT
      },
      control: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN,
      },
      createdAt: {
        defaultValue: Sequelize.fn('NOW'),
        type: Sequelize.DATE,
      },
      updatedAt: {
        defaultValue: Sequelize.fn('NOW'),
        onUpdate: 'SET DEFAULT',
        type: Sequelize.DATE,
      },
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('bookmarks');
  }
};
