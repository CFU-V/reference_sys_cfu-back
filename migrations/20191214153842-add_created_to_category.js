'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('categories', 'createdAt', {
      defaultValue: Sequelize.fn('NOW'),
      type: Sequelize.DATE,
    })
      .then(async() => {
        return queryInterface.addColumn('categories', 'updatedAt', {
          defaultValue: Sequelize.fn('NOW'),
          type: Sequelize.DATE,
        })
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('categories', 'createdAt')
      .then(() => {
        return queryInterface.removeColumn('categories', 'updatedAt')
      })
  }
};
