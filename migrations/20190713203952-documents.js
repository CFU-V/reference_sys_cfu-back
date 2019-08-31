'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('documents', {
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
      },
      info: {
        allowNull: false,
        type: Sequelize.STRING(6000),
      },
      categoryId: {
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        type: Sequelize.INTEGER,
      },
      active: {
        allowNull: false,
        defaultValue: true,
        type: Sequelize.BOOLEAN,
      },
      visibility: {
        allowNull: false,
        defaultValue: true,
        type: Sequelize.BOOLEAN,
      },
      parentId: {
        allowNull: true,
        references: {
          model: 'documents',
          key: 'id'
        },
        onDelete: 'CASCADE',
        type: Sequelize.BIGINT,
      },
      ownerId: {
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        type: Sequelize.INTEGER,
      },
      link: {
        allowNull: false,
        type: Sequelize.Sequelize.STRING(1024),
      },
      consultant_link: {
        allowNull: true,
        type: Sequelize.Sequelize.STRING(1024),
      },
      renew: {
        allowNull: true,
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
    return queryInterface.dropTable('documents');
  }
};
