import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { LOG_FILENAME_PATTERN } from '../common/constants';

@Injectable()
export class LogsService {
    constructor(
    ) {}

    downloadLogs(fileName: string) {
        const filePath  = `${process.env.LOG_DIR}/${fileName}`;
        if (fs.existsSync(filePath)) {
            return fs.createReadStream(filePath);
        } else {
            throw new HttpException('File doesn`t exist', 404);
        }
    }

    getList() {
        return new Promise((resolve, reject) => {
            fs.readdir(process.env.LOG_DIR, (error, files) => {
                if (error) {
                    reject(error);
                }
                resolve(files.filter((file) => {
                    if (file.match(LOG_FILENAME_PATTERN)) {
                        return file;
                    }
                }));
            });
        });
    }
}
