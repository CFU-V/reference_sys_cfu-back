import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Document } from './entities/document.entity';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { DocumentDto, FormattedDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import * as fs from 'fs';
import DocumentParser from './document.parser';
import { Op, QueryTypes } from 'sequelize';
import { buildDocumentTree } from '../core/TreeBuilder';
import { DocumentRecursiveDto } from './dto/document.tree.dto';
import Utils from '../core/Utils';
import * as path from 'path';
import { DOCX_TPM_FOLDER_PATH } from '../common/constants';
import { DocumentPropertyDto } from './dto/document.property.dto';
import { GetDocumentDto } from './dto/deocument.get.dto';
import { Bookmark } from '../bookmarks/entities/bookmark.entity';
import { BodyDocumentPropertyDto } from './dto/document.body.property.dto';

@Injectable()
export class DocumentService {
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
        @Inject('BookmarkRepository') private readonly bookmarkRepository: typeof Bookmark,
    ) {}

    async addDocument(ownerId: number, filePath: string, document: DocumentDto) {
        return await this.documentRepository.create({
            title: document.title,
            ownerId,
            parentId: document.parentId,
            info: document.info,
            categoryId: document.categoryId,
            active: document.active,
            number: Utils.prettify(document.number),
            visibility: document.visibility,
            renew: document.renew,
            link: filePath,
        });
    }

    async getListDocument(user: any, autocomplete?: string, title?: string, page?: number, pageSize?: number) {
        page = page > 0 ? page : PAGE;
        pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
        const offset: number = pageSize * page;
        const where = {};

        if (!user) {
            where['visibility'] = true;
        }

        if (autocomplete === 'true') {
            where['title'] = {[Op.iLike]: `%${title ? title : ''}%`} ;
        }

        const options = {
            limit: pageSize,
            offset,
            where,
        };

        const result = await this.documentRepository.findAndCountAll(options);

        return new EntitiesWithPaging(result.rows, result.count, page, pageSize);
    }

    async getDocument(id: number, user: any): Promise<GetDocumentDto> {
        const documents: Array<DocumentRecursiveDto> = await this.documentRepository.sequelize.query(
            'WITH RECURSIVE sub_documents(id, link, "parentId", level) AS (' +
            `SELECT id, link, "parentId", 1 FROM documents WHERE id = :nodeId ${user ? '' : 'AND visibility = :visibility'} ` +
            'UNION ALL ' +
            'SELECT d.id, d.link, d."parentId", level+1 ' +
            'FROM documents d, sub_documents sd ' +
            'WHERE d."parentId" = sd.id) ' +
            'SELECT id, link, "parentId", level FROM sub_documents ORDER BY level ASC, id ASC;',
            {replacements: { nodeId: id, visibility: true }, type: QueryTypes.SELECT, mapToModel: true });

        if (documents.length > 0) {
            const response: GetDocumentDto = {
                fileName: '',
            };
            const documentParser = new DocumentParser();
            const resultDocument: FormattedDocumentDto = await documentParser.formatLite(await buildDocumentTree(documents, id));
            response.fileName = resultDocument.resultedFileName;
            if (user) {
                response.bookmarks =  await this.bookmarkRepository.findOne({ where: { userId: user.id, docId: id } });
            }
            return response;
        } else {
            throw new HttpException(`Document with id = ${id} dosen't exist or permission denied`, HttpStatus.NOT_FOUND);
        }
    }

    async getDocumentProps(id: number): Promise<DocumentPropertyDto> {
        let documentProps;
        const document = await this.documentRepository.findOne({ where: { id } });

        if (document) {
            const documentParser = new DocumentParser();
            documentProps = await documentParser.getProps(document.link);
        }

        return documentProps;
    }

    async setDocumentProps(props: BodyDocumentPropertyDto): Promise<void> {
        const document = await this.documentRepository.findOne({ where: { id: props.id } });

        if (document) {
            const documentParser = new DocumentParser();
            await documentParser.setProps(document, props);
        } else {
            throw new HttpException(`Document with id ${props.id} dosen't exist`, 404);
        }
    }

    async downloadDocument(id: number, user: any) {
        const whereOpt = { id };

        if (!user) {
            whereOpt['visibility'] = true;
        }

        const document = await this.documentRepository.findOne({where: whereOpt });
        if (document) {
            const fileName = path.basename(document.link);
            if (fs.existsSync(path.resolve(__dirname, `${DOCX_TPM_FOLDER_PATH}/${fileName}`))) {
                return fs.createReadStream(path.resolve(__dirname, `${DOCX_TPM_FOLDER_PATH}/${fileName}`));
            } else {
                throw new HttpException(
                    `File with name ${fileName} dosen't exist, try to call /document?id=${id}`,
                    HttpStatus.NOT_FOUND,
                );
            }
        } else {
            throw new HttpException(
                `File with id = ${id} dosen't exist or permissions denied`,
                HttpStatus.NOT_FOUND,
            );
        }
    }

    async updateDocument(filePath: string, ownerId: number, document: UpdateDocumentDto) {
        try {
            const oldDoc = await this.documentRepository.findOne({ where: {id: document.id} });
            if (oldDoc) {
                if (filePath) {
                    Utils.deleteIfExist(oldDoc.link);
                }

                if (
                    document.deleteChilds ||
                    document.deleteChilds.toString() === 'true'
                ) {
                    await this.documentRepository.destroy({ where: { parentId: oldDoc.id } });
                }

                return await oldDoc.update({
                    title: document.title ? document.title : oldDoc.title,
                    ownerId,
                    parentId: document.parentId ? document.parentId : oldDoc.parentId,
                    info: document.info ? document.info : oldDoc.info,
                    categoryId: document.categoryId ? document.categoryId : oldDoc.categoryId,
                    active: document.active ? document.active : oldDoc.active,
                    number: document.number ? Utils.prettify(document.number) : oldDoc.number,
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
                Utils.deleteIfExist(document.link);
                return deleted;
            } catch (e) {
                t.rollback();
                throw e;
            }
        } else {
          throw new HttpException(`Document with id ${id} doesn\`t exist.`, HttpStatus.BAD_REQUEST);
        }
    }
}
