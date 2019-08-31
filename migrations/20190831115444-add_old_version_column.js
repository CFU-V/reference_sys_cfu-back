'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('documents', 'old_version', {
      allowNull: true,
      references: {
        model: 'documents',
        key: 'id'
      },
      onDelete: 'CASCADE',
      type: Sequelize.BIGINT,
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('documents', 'old_version')
  }
};
