'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('documents', 'date', {
      type: Sequelize.DATE,
    })
        .then(async() => {
          return await queryInterface.bulkUpdate('documents', { date: new Date() }, {})
        })
        .then(() => {
          queryInterface.changeColumn(
              'documents',
              'date',
              {
                type      : Sequelize.DATE,
                allowNull : false
              }
          )
        })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('documents', 'date')
  }
};
