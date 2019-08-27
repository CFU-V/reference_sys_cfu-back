'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
  return queryInterface.bulkInsert('categories', [
    {
      title: 'Законодательство'
    },
    {
      title: 'Судебная практика'
    },
    {
      title: 'Финансовые и кадровые консультации'
    },
    {
      title: 'Консультации для бюджетных организаций'
    },
    {
      title: 'Комментарии законодательства'
    },
    {
      title: 'Формы документов'
    },
    {
      title: 'Технические нормы и правила'
    },
    {
      title: 'Проекты правовых актов'
    },
    {
      title: 'Международные правовые акты'
    },
    {
      title: 'Правовые акты по здравоохранению'
    },
  ], {});
},

down: (queryInterface, Sequelize) => {
  return queryInterface.bulkDelete('categories', null, {});
}
};
