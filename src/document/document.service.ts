import {HttpException, HttpStatus, Inject, Injectable} from '@nestjs/common';
import {Document} from './entities/document.entity';
import {EntitiesWithPaging} from '../common/paging/paging.entities';
import {PAGE, PAGE_SIZE} from '../common/paging/paging.constants';
import {DocumentDto, FormattedDocumentDto, UpdateDocumentDto} from './dto/document.dto';
import * as fs from 'fs';
import DocumentParser from "./document.parser";
import { QueryTypes } from "sequelize";
import { buildDocumentTree } from "../core/TreeBuilder";
import {DocumentRecursiveDto} from "./dto/document.tree.dto";

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
            categoryId: document.categoryId,
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
        // const options = {
        //     where: user ? { id } : { id, visibility: true },
        //     attributes: ['id', 'link'],
        // };
        //let document = await this.documentRepository.findOne(options);
        let resultDocument: FormattedDocumentDto;

        let documents: Array<DocumentRecursiveDto> = await this.documentRepository.sequelize.query(
            'WITH RECURSIVE sub_documents(id, link, "parentId", level) AS (' +
            `SELECT id, link, "parentId", 1 FROM documents WHERE id = :nodeId ${user ? '' : 'AND visibility = :visibility'} ` +
            'UNION ALL ' +
            'SELECT d.id, d.link, d."parentId", level+1 ' +
            'FROM documents d, sub_documents sd ' +
            'WHERE d."parentId" = sd.id) ' +
            'SELECT id, link, "parentId", level FROM sub_documents ORDER BY level ASC, id ASC;',
            {replacements: { nodeId: id, visibility: true }, type: QueryTypes.SELECT, mapToModel: true });

        if (documents) {
            const documentParser = new DocumentParser();
            resultDocument = await documentParser.format(await buildDocumentTree(documents, id));
        }
        console.log(resultDocument.formatted.xml())
        return resultDocument.formatted.xml();
    }

    async updateDocument(filePath: string, ownerId: number, document: UpdateDocumentDto) {
        try {
            const oldDoc = await this.documentRepository.findOne({ where: {id: document.id} });
            if (oldDoc) {
                if (filePath) {
                    fs.unlinkSync(oldDoc.link)
                }
                return await oldDoc.update({
                    title: document.title ? document.title : oldDoc.title,
                    ownerId,
                    parentId: document.parentId ? document.parentId : oldDoc.parentId,
                    info: document.info ? document.info : oldDoc.info,
                    categoryId: document.categoryId ? document.categoryId : oldDoc.categoryId,
                    active: document.active ? document.active : oldDoc.active,
                    visibility: document.visibility ? document.visibility : oldDoc.visibility,
                    link: filePath ? filePath : oldDoc.link,
                    renew: document.renew ? document.renew : oldDoc.renew,
                });
            } else {
                return new HttpException(`Document with id ${document.id} doesn\`t exist.`, HttpStatus.BAD_REQUEST);
            }
        } catch (error) {
            console.log(error);
            throw error;
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
