'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('documents', 'number', {
      allowNull: false,
      type: Sequelize.STRING,
      unique: false,
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('documents', 'number')
  }
};
