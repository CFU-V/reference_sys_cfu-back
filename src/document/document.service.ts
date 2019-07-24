import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Document } from './entities/document.entity';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { DocumentDto, UpdateDocumentDto } from './dto/document.dto';

import * as fs from 'fs';
import Utils from '../core/Utils';
import { extname } from 'path';

@Injectable()
export class DocumentService {
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
    ) {}

    async addDocument(ownerId: number, filePath: string, document: DocumentDto) {
        return await this.documentRepository.create({
            title: document.title,
            ownerId,
            parentId: document.parentId,
            info: document.info,
            type: document.type,
            active: document.active,
            visibility: document.visibility,
            renew: document.renew,
            link: filePath,
        });
    }

    async updateDocument(ownerId: number, document: UpdateDocumentDto) {
        const oldDoc = await this.documentRepository.findOne({ where: {id: document.id} });
        if (oldDoc) {
            return await oldDoc.update({
                title: document.title,
                ownerId,
                parentId: document.parentId,
                info: document.info,
                type: document.type,
                active: document.active,
                visibility: document.visibility,
                renew: document.renew,
            });
        } else {
            return new HttpException(`Document with id ${document.id} doesn\`t exist.`, HttpStatus.BAD_REQUEST);
        }
    }

    async deleteDocument(id: number) {
        const document = await this.documentRepository.findOne({ where: {id} });

        if (document) {
            fs.unlinkSync(document.link);
            return await document.destroy();
        } else {
          return new HttpException(`Document with id ${document.id} doesn\`t exist.`, HttpStatus.BAD_REQUEST);
        }
    }
}
