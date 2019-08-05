import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');

const transport = new (DailyRotateFile) ({
    filename: 'logs-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '1gb',
    dirname: process.env.LOG_DIR,
    maxFiles: '90d'
});

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
        ),
    transports: [transport]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

export default logger;
