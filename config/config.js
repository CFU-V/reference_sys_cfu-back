require('dotenv').config();

module.exports = {
    development: {
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT,
        define: {
            underscored: true
        },
        smtp: {
            ClientId: process.env.SMTP_CLIENT_ID,
            ClientSecret: process.env.SMTP_CLIENT_SECRET,
            Url: process.env.SMTP_REDIRECT_URL,
            refresh_token: process.env.SMTP_REFRESH_TOKEN,
            smtpUser: process.env.SMTP_USER
        },
    },
    test: {
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT,
        define: {
            underscored: true
        },
        smtp: {
            ClientId: process.env.SMTP_CLIENT_ID,
            ClientSecret: process.env.SMTP_CLIENT_SECRET,
            Url: process.env.SMTP_REDIRECT_URL,
            refresh_token: process.env.SMTP_REFRESH_TOKEN,
            smtpUser: process.env.SMTP_USER
        },
    },
    production: {
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT,
        define: {
            underscored: true
        },
        smtp: {
            ClientId: process.env.SMTP_CLIENT_ID,
            ClientSecret: process.env.SMTP_CLIENT_SECRET,
            Url: process.env.SMTP_REDIRECT_URL,
            refresh_token: process.env.SMTP_REFRESH_TOKEN,
            smtpUser: process.env.SMTP_USER
        },
    },
}
