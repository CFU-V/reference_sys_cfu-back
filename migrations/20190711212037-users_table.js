'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      login: {
        allowNull: false,
        type: Sequelize.STRING(25),
        unique: true
      },
      password: {
        allowNull: false,
        type: Sequelize.STRING(256)
      },
      lastName: {
        allowNull: false,
        type: Sequelize.STRING(30)
      },
      firstName: {
        allowNull: false,
        type: Sequelize.STRING(30)
      },
      surName: {
        allowNull: false,
        type: Sequelize.STRING(50)
      },
      birthDate: {
        allowNull: false,
        type: Sequelize.DATE
      },
      position: {
        allowNull: false,
        type: Sequelize.STRING(100)
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING(256),
        unique: true,
        validate: {
          isEmail: {
            args: true,
            msg: 'Incorrect email'
          }
        }
      },
      phone: {
        allowNull: false,
        type: Sequelize.STRING(50),
        unique: true
      },
      roleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id',
        },
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
    return queryInterface.dropTable('users');
  }
};
