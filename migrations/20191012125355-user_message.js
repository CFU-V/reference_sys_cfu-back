'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable('userMessage',
        {
          messageId: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            references: {
              model: 'messages',
              key: 'id'
            },
            allowNull: false
          },
          recipientId: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            references: {
              model: 'users',
              key: 'id'
            },
            allowNull: false
          },
          isRead: {
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
          }
        }
    )},
  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('userMessage')
  }
};

