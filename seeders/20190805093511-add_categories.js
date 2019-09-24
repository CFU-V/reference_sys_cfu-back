'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
  return queryInterface.bulkInsert('categories', [
    {
      title: 'Приказы'
    },
    {
      title: 'Распоряжения'
    },
    {
      title: 'Письма'
    },
    {
      title: 'Стандарты'
    },
    {
      title: 'Методические указания'
    },
    {
      title: 'Решения Ученого совета университета'
    },
    {
      title: 'Решения наблюдательного совета университета'
    },
    {
      title: 'Решения учебно-методического совета университета (ВО)'
    },
    {
      title: 'Решения учебно-методического совета университета (СПО)'
    }
  ], {});
},

  down: (queryInterface, Sequelize) => {
  return queryInterface.bulkDelete('categories', null, {});
}
};
