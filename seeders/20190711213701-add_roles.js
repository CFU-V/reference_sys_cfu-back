'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('roles', [
      {
        name: 'admin',
        remark: 'Admin opportunities: manage users, managers possibilities'
      },
      {
        name: 'manager',
        remark: 'Manager opportunities: manage documents, common users possibilities'
      },
      {
        name: 'common',
        remark: 'Common opportunities: add documents in bookmarks'
      },
    ], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('roles', null, {});
  }
};
