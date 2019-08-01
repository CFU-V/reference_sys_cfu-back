import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Document } from './entities/document.entity';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { DocumentDto, UpdateDocumentDto } from './dto/document.dto';
import * as fs from 'fs';
import DocumentParser from "./document.parser";

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

    async getListDocument(user: any, page?: number, pageSize?: number) {
        page = page > 0 ? page : PAGE;
        pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
        const offset: number = pageSize * page;
        const options = {
            limit: pageSize,
            offset,
            where: user ? {} : { visibility: true },
        };

        const result = await this.documentRepository.findAndCountAll(options);

        return new EntitiesWithPaging(result.rows, result.count, page, pageSize);
    }

    async getDocument(id: number, user: any) {
        const options = {
            where: user ? { id } : { id, visibility: true },
            attributes: ['id', 'link'],
        };

        let document = await this.documentRepository.findOne(options);

        if (document) {
            const documentParser = new DocumentParser(this.documentRepository, document);
            document = documentParser.format();
        }

        return document;
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
            const t = await this.documentRepository.sequelize.transaction();
            try {
                const deleted = await document.destroy({transaction: t});

                t.commit();
                fs.unlinkSync(document.link);
                return deleted;
            } catch (e) {
                t.rollback();
                throw e;
            }
        } else {
          return new HttpException(`Document with id ${document.id} doesn\`t exist.`, HttpStatus.BAD_REQUEST);
        }
    }
}
