import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';
import { Dialect } from 'sequelize';
/**
 * Load config
 */
dotenv.config();

export const databaseProviders = [
    {
        provide: 'SequelizeToken',
        useFactory: async () => {
            const dialect: Dialect = process.env.DB_DIALECT as Dialect;
            const host: string = process.env.DB_HOST;
            const sequelize = new Sequelize(
              process.env.DB_NAME,
              process.env.DB_USER,
              process.env.DB_PASSWORD,
              {dialect, host},
            );
            sequelize.addModels([]);
            await sequelize.sync();
            return sequelize;
        },
    },
];
