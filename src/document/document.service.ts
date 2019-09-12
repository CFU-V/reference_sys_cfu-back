import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Document } from './entities/document.entity';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { DocumentDto, FormattedDocumentDto, FullDocumentDto, IndexedDocumentDto, IndexingDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import * as fs from 'fs';
import DocumentParser from './document.parser';
import { Op, QueryTypes } from 'sequelize';
import { buildDocumentTree } from '../core/TreeBuilder';
import { DocumentRecursiveDto } from './dto/document.tree.dto';
import Utils from '../core/Utils';
import * as path from 'path';
import { mailService } from '../core/MailService';
import { DOCX_TPM_FOLDER_PATH, SHARING_METHOD } from '../common/constants';
import { DocumentPropertyDto } from './dto/document.property.dto';
import { GetDocumentDto } from './dto/deocument.get.dto';
import { Bookmark } from '../bookmarks/entities/bookmark.entity';
import { BodyDocumentPropertyDto } from './dto/document.body.property.dto';
import { DocumentSrhareDto } from './dto/document.srhare.dto';
import { User } from '../user/entities/user.entity';
import { DocumentNewsDto } from './dto/document.news.dto';
import * as moment from 'moment';

@Injectable()
export class DocumentService {
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
        @Inject('BookmarkRepository') private readonly bookmarkRepository: typeof Bookmark,
        @Inject('UserRepository') private readonly userRepository: typeof User,
    ) {}

    async addDocument(ownerId: number, filePath: string, document: DocumentDto) {
        try {
            if (document.old_version) {
                const documents: Array<FullDocumentDto> = await this.documentRepository.sequelize.query(
                    'WITH RECURSIVE sub_documents(id, ' +
                    'title, "ownerId", info, ' +
                    '"categoryId", link, "parentId", ' +
                    'old_version, number, visibility, renew, level) AS (' +
                    `SELECT id, ` +
                    `title, "ownerId", info, ` +
                    `"categoryId", link, "parentId", ` +
                    `old_version, number, visibility, renew, ` +
                    `1 FROM documents WHERE id = :nodeId ` +
                    'UNION ALL ' +
                    'SELECT d.id, ' +
                    'd.title, d."ownerId", d.info, ' +
                    'd."categoryId", d.link, d."parentId", ' +
                    'd.old_version, d.number, d.visibility, d.renew, ' +
                    'level+1 ' +
                    'FROM documents d, sub_documents sd ' +
                    'WHERE d."parentId" = sd.id) ' +
                    'SELECT id, ' +
                    'title, "ownerId", info, ' +
                    '"categoryId", link, "parentId", ' +
                    'old_version, number, visibility, renew, ' +
                    'level FROM sub_documents ORDER BY level ASC, id ASC;',
                    {replacements: { nodeId: document.old_version }, type: QueryTypes.SELECT, mapToModel: true });
                const values = [];
                for (const recursiveDocument of documents) {
                    values.push([
                        recursiveDocument.id,
                        recursiveDocument.title,
                        recursiveDocument.ownerId,
                        recursiveDocument.info,
                        recursiveDocument.categoryId,
                        recursiveDocument.link,
                        recursiveDocument.parentId,
                        recursiveDocument.old_version,
                        recursiveDocument.number,
                        recursiveDocument.visibility,
                        recursiveDocument.renew,
                        false]);
                }

                const query = 'INSERT INTO documents (id, ' +
                    'title, "ownerId", info, ' +
                    '"categoryId", link, "parentId", ' +
                    'old_version, number, visibility, renew, active) VALUES ' +
                    values.map(_ => '(?)').join(',') +
                    ' ON CONFLICT (id) DO UPDATE SET active = excluded.active;';

                await this.documentRepository.sequelize.query({ query, values }, { type: QueryTypes.INSERT });
            }

            return await this.documentRepository.create({
                title: document.title,
                ownerId,
                parentId: document.parentId,
                info: document.info,
                categoryId: document.categoryId,
                active: document.active,
                old_version: document.old_version,
                number: Utils.prettify(document.number),
                visibility: document.visibility,
                renew: document.renew,
                link: filePath,
            });
        } catch (error) {
            console.log(error);
            throw error;
        }
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
            'WITH RECURSIVE sub_documents(id, link, old_version, "parentId", info, level) AS (' +
            `SELECT id, link, old_version, "parentId", info, 1 FROM documents WHERE id = :nodeId ${user ? '' : 'AND visibility = :visibility'} ` +
            'UNION ALL ' +
            'SELECT d.id, d.link, d.old_version, d."parentId", d.info, level+1 ' +
            'FROM documents d, sub_documents sd ' +
            'WHERE d."parentId" = sd.id) ' +
            'SELECT id, link, old_version, "parentId", info, level FROM sub_documents ORDER BY level ASC, id ASC;',
            {replacements: { nodeId: id, visibility: true }, type: QueryTypes.SELECT, mapToModel: true });

        if (documents.length > 0) {
            const response: GetDocumentDto = {
                fileName: '',
                info: '',
            };
            const documentParser = new DocumentParser();
            const resultDocument: FormattedDocumentDto = await documentParser.formatLite(await buildDocumentTree(documents, id));
            response.fileName = resultDocument.resultedFileName;
            response.info = resultDocument.info;
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

    async getDocumentNews(user: any): Promise<DocumentNewsDto> {
        const whereCreated = {
                createdAt: {
                    [Op.gte]: moment().subtract(7, 'days').toDate(),
                },
            };

        if (!user) {
            whereCreated['visibility'] = true;
        }

        const created = await this.documentRepository.findAll({ where: whereCreated });
        const createdIds = [];

        for (const create of created) {
            createdIds.push(create.id);
        }
        const whereUpdated = {
                updatedAt: {
                    [Op.gte]: moment().subtract(7, 'days').toDate(),
                },
            };

        if (!user) {
            whereUpdated['visibility'] = true;
        }

        const updated = await this.documentRepository.findAll({ where: whereUpdated });
        return {
            created,
            updated: await updated.filter((el) => {
                return moment(el.createdAt).format('MMMM Do YYYY, h:mm:ss') !== moment(el.updatedAt).format('MMMM Do YYYY, h:mm:ss');
            }),
        };
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

    async shareDocument(user: any, mailInfo: DocumentSrhareDto): Promise<any> {
        try {
            const document = await this.documentRepository.findOne({ where: { id: mailInfo.documentId } });

            if (document) {
                const fileName = path.basename(document.link);
                const filePath = path.resolve(__dirname, `${DOCX_TPM_FOLDER_PATH}/${fileName}`);
                if (fs.existsSync(filePath)) {
                    const sender = await this.userRepository.findOne({ where: { id: user.id }});
                    return await mailService.sendUserMail(
                        mailInfo.recipientMail,
                        `${sender.lastName} ${sender.firstName} ${sender.surName}`,
                        SHARING_METHOD,
                        mailInfo.message,
                        filePath,
                        Utils.fileNameTemplate(document.title),
                    );
                } else {
                    await this.getDocument(document.id, user);
                    const sender = await this.userRepository.findOne({ where: { id: user.id }});
                    return await mailService.sendUserMail(
                        mailInfo.recipientMail,
                        `${sender.lastName} ${sender.firstName} ${sender.surName}`,
                        SHARING_METHOD,
                        mailInfo.message,
                        filePath,
                        Utils.fileNameTemplate(document.title),
                    );
                }
            } else {
                throw new HttpException(`Document with id ${mailInfo.documentId} dosen't exist`, HttpStatus.NOT_FOUND);
            }
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async downloadDocument(id: number, user?: any) {
        const whereOpt = { id };

        // if (!user) {
        //     whereOpt['visibility'] = true;
        // }

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
