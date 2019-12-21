import {HttpException, HttpStatus, Inject, Injectable, OnModuleInit} from '@nestjs/common';
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
import {
    DOCUMENT_INDEX,
    BAD_DOC_NAME,
    DOCX_TPM_FOLDER_PATH,
    DOWNLOAD_CONSULTANT_LINK,
    SHARING_METHOD,
    WAIT_DOC_NAME,
} from '../common/constants';
import { DocumentPropertyDto } from './dto/document.property.dto';
import { GetDocumentDto } from './dto/deocument.get.dto';
import { Bookmark } from '../bookmarks/entities/bookmark.entity';
import { BodyDocumentPropertyDto } from './dto/document.body.property.dto';
import { DocumentSrhareDto } from './dto/document.srhare.dto';
import { User } from '../user/entities/user.entity';
import { DocumentNewsDto } from './dto/document.news.dto';
import * as moment from 'moment';
import { Category } from '../category/entities/category.entity';
import * as request from 'request';
import * as url from 'url';
import * as iconv from 'iconv-lite';
import { CronJob } from 'cron';
import { SearchService } from '../search/search.service';
import { SearchIndexing } from '../search/search.indexing';
import * as rimraf from 'rimraf';
import { Map } from 'search/search.map';
import { CompareDataResponseDto } from './dto/compare.data.response.dto';

@Injectable()
export class DocumentService implements OnModuleInit {
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
        @Inject('BookmarkRepository') private readonly bookmarkRepository: typeof Bookmark,
        @Inject('CategoryRepository') private readonly categoryRepository: typeof Category,
        @Inject('UserRepository') private readonly userRepository: typeof User,
    ) {}

    async onModuleInit() {
        this.indexCronJob();
    }

    indexCronJob() {
        new CronJob('00 19 * * *', this.fetchDocuments.bind(this)).start();
        new CronJob('00 23 * * *', this.deleteIndexes.bind(this, 0, 100)).start();
        new CronJob('00 03 * * *', this.deleteTempDocs.bind(this)).start();
    }

    async deleteIndexes(page?: number, pageSize?: number) {
        try {
            page = page > 0 ? page : PAGE;
            pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
            const searchService = SearchService.getInstance(this.documentRepository);
            const searchIndexing = SearchIndexing.getInstance(this.documentRepository);
            const elasticDocsEntity = await searchService.searchAllData(page, pageSize, false);
            const elasticDocs = elasticDocsEntity.entities;
            for (const elasticDoc of elasticDocs) {
                const storeDoc = await this.documentRepository.findOne({ where: { id: elasticDoc._source.id } });
                if (storeDoc) {
                    searchIndexing.deleteIfExist(DOCUMENT_INDEX, [elasticDoc._id]);
                }
            }
            page = page + 1;
            const offset = pageSize * page;
            if (offset <= elasticDocsEntity.totalItems) {
                await this.deleteIndexes(page, pageSize);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async deleteTempDocs() {
        try {
            const filePath = path.resolve(__dirname, DOCX_TPM_FOLDER_PATH);
            rimraf(filePath, () => { console.log('TEMP DOCS DELETED'); });
        } catch (error) {
            console.error(error);
        }
    }

    async fetchDocuments(): Promise<void> {
        try {
            const docs = await this.documentRepository.findAll({
                where: {
                    [Op.or] : [
                        {
                            link: process.env.WAIT_DOC_PAGE,
                        },
                        {
                            renew: true,
                        },
                    ],
                },
            });
            for (const doc of docs) {
                const downloadedDocumentLink = await this.downloadConsultantFile(doc.consultant_link);
                if (downloadedDocumentLink) {
                    await this.addDocument(doc.ownerId, downloadedDocumentLink, doc);
                } else {
                    await this.documentRepository.update({ link: process.env.BAD_DOC_PAGE }, { where: { id: doc.id } });
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    async fetchCategories(total: string = 'false', page?: number, pageSize?: number) {
        if (total === 'true') {
            return this.categoryRepository.findAll({ attributes: ['id', 'title'] });
        } else {
            page = page > 0 ? page : PAGE;
            pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
            const offset: number = pageSize * page;
            const result =  await this.categoryRepository.findAndCountAll({
                limit: pageSize,
                offset,
                attributes: ['id', 'title'],
            });
            return new EntitiesWithPaging(result.rows, result.count, page, pageSize);
        }
    }

    async addDocumentFromConsultant(ownerId: number, document: DocumentDto): Promise<Document> {
        try {
            const downloadedDocumentLink = await this.downloadConsultantFile(document.consultant_link);
            if (downloadedDocumentLink) {
                return await this.addDocument(ownerId, downloadedDocumentLink, document);
            } else {
                return await this.documentRepository.create({
                    title: Utils.prettifyString(document.title),
                    ownerId,
                    parentId: document.parentId,
                    info: document.info,
                    categoryId: document.categoryId,
                    active: document.active,
                    old_version: document.old_version,
                    number: Utils.prettifyDocumentNumber(document.number),
                    consultant_link: document.consultant_link,
                    visibility: document.visibility,
                    renew: document.renew,
                    link: process.env.WAIT_DOC_PAGE,
                    date: new Date(document.date),
                });
            }
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async compareDocuments(sourceId: number, compareId: number, page: number): Promise<CompareDataResponseDto> {
        try {
            const documents = await this.documentRepository.findAll({ where: {
                    [Op.or] : [
                        { id: sourceId },
                        { id: compareId },
                    ],
                },
            });
            const source = documents.find((document) => (document.id === sourceId));
            const compare = documents.find((document) => (document.id === compareId));
            if (source && compare) {
                const documentParser = new DocumentParser();
                const sourceTextPage = await documentParser.getTextByPage(source, page, true);
                const compareTextPage = await documentParser.getTextByPage(compare, page, false);
                return {
                    sourceText: sourceTextPage.text,
                    compareText: compareTextPage.text,
                    totalPages: sourceTextPage.total,
                    page,
                };
            } else {
                if (!source) {
                    throw new HttpException(`Document ${sourceId} dose not exist`, HttpStatus.BAD_REQUEST);
                } else {
                    throw new HttpException(`Document ${compareId} dose not exist`, HttpStatus.BAD_REQUEST);
                }
            }
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async downloadConsultantFile(consultantUrl: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const link = url.parse(consultantUrl, true);
            const correctUrl = `${DOWNLOAD_CONSULTANT_LINK}&base=${link.query.base}&n=${link.query.n}&page=text`;
            request(
                {
                    uri: correctUrl,
                    headers: { 'Content-type' : 'applcation/pdf' },
                    encoding: null,
                },
                (error, res, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        if (res.statusCode === 200) {
                            const filePath = `${process.env.DOCUMENT_STORAGE}/${Utils.getRandomFileName()}.pdf`;
                            fs.writeFileSync(filePath, body, 'binary');
                            resolve(filePath);
                        } else {
                            if (iconv.decode(body, 'win1251').includes('В настоящее время текст документа недоступен')) {
                                resolve(null);
                            } else {
                                reject(new HttpException(
                                    'Неверная ссылка на документ. ' +
                                    'Такого документа не существует в базе КонсультантПлюс. ' +
                                    'Убедитесь, что ссылка скопирована верно и повторите запрос.',
                                    404),
                                );
                            }
                        }
                    }
                });
        });
    }

    async addDocument(ownerId: number, filePath: string, document: DocumentDto): Promise<Document> {
        let transaction;
        try {
            transaction = await this.documentRepository.sequelize.transaction();
            if (document.old_version) {
                const documents: FullDocumentDto[] = await this.documentRepository.sequelize.query(
                    'WITH RECURSIVE sub_documents(id, ' +
                    'title, "ownerId", info, ' +
                    '"categoryId", link, "parentId", ' +
                    'old_version, number, visibility, renew, "date", level) AS (' +
                    `SELECT id, ` +
                    `title, "ownerId", info, ` +
                    `"categoryId", link, "parentId", ` +
                    `old_version, number, visibility, renew, ` +
                    `1 FROM documents WHERE id = :nodeId ` +
                    'UNION ALL ' +
                    'SELECT d.id, ' +
                    'd.title, d."ownerId", d.info, ' +
                    'd."categoryId", d.link, d."parentId", ' +
                    'd.old_version, d.number, d.visibility, d.renew, d."date"' +
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
                        `${recursiveDocument.title}_${recursiveDocument.id}_устаревший`,
                        recursiveDocument.ownerId,
                        recursiveDocument.info,
                        recursiveDocument.categoryId,
                        recursiveDocument.link,
                        recursiveDocument.parentId,
                        recursiveDocument.old_version,
                        recursiveDocument.consultant_link,
                        recursiveDocument.number,
                        recursiveDocument.visibility,
                        recursiveDocument.renew,
                        new Date(recursiveDocument.date),
                        false]);
                }

                const query = 'INSERT INTO documents (id, ' +
                    'title, "ownerId", info, ' +
                    '"categoryId", link, "parentId", ' +
                    'old_version, number, visibility, renew, date, active) VALUES ' +
                    values.map(_ => '(?)').join(',') +
                    ' ON CONFLICT (id) DO UPDATE SET active = excluded.active, title = excluded.title;';

                await this.documentRepository.sequelize.query({ query, values }, { type: QueryTypes.INSERT, transaction });
            }

            const newDoc = await this.documentRepository.create({
                title: Utils.prettifyString(document.title),
                ownerId,
                parentId: document.parentId,
                info: document.info,
                categoryId: document.categoryId,
                active: document.active,
                old_version: document.old_version,
                number: Utils.prettifyDocumentNumber(document.number),
                consultant_link: document.consultant_link,
                visibility: document.visibility,
                renew: document.renew,
                date: new Date(document.date),
                link: filePath,
            });
            transaction.commit();
            return newDoc;
        } catch (error) {
            transaction.rollback();
            console.log(error);
            if (filePath) {
                Utils.deleteIfExist(filePath);
            }
            throw error;
        }
    }

    async getListDocument(user: any, autocomplete?: string, title?: string, page?: number, pageSize?: number) {
        try {
            title = title ? Utils.prettifyString(title) : title;
            page = page > 0 ? page : PAGE;
            pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
            const offset: number = pageSize * page;
            const where = {};

            if (!user) {
                where['visibility'] = true;
            }

            if (autocomplete === 'true') {
                if (title.indexOf('№') !== -1) {
                    if (title.indexOf('№ ') !== -1) {
                        where[Op.or] = [
                            {
                                title: { [Op.iLike]: `%${title}%` },
                            },
                            {
                                title: { [Op.iLike]: `%${title.replace('№ ', '№')}%` },
                            },
                        ];
                    } else {
                        where[Op.or] = [
                            {
                                title: { [Op.iLike]: `%${title}%` },
                            },
                            {
                                title: { [Op.iLike]: `%${title.replace('№', '№ ')}%` },
                            },
                        ];
                    }
                } else if (title.indexOf('#') !== -1) {
                    if (title.indexOf('# ') !== -1) {
                        where[Op.or] = [
                            {
                                title: { [Op.iLike]: `%${title}%` },
                            },
                            {
                                title: { [Op.iLike]: `%${title.replace('# ', '#')}%` },
                            },
                        ];
                    } else {
                        where[Op.or] = [
                            {
                                title: { [Op.iLike]: `%${title}%` },
                            },
                            {
                                title: { [Op.iLike]: `%${title.replace('#', '# ')}%` },
                            },
                        ];
                    }
                } else {
                    where['title'] = {[Op.iLike]: `%${title ? title : ''}%`};
                }
            }

            const options = {
                limit: pageSize,
                offset,
                where,
            };

            const result = await this.documentRepository.findAndCountAll(options);

            return new EntitiesWithPaging(result.rows, result.count, page, pageSize);
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async getDocument(id: number, user: any, date?: string, source?: string): Promise<GetDocumentDto> {
        const document: Document = await this.documentRepository.findOne({ where: { id } });
        if (document) {
            if (!document.consultant_link) {
                if (source !== 'true') {
                    const documents: DocumentRecursiveDto[] = await this.documentRepository.sequelize.query(
                        'WITH RECURSIVE sub_documents(id, link, old_version, "parentId", info, "date", number, "categoryId", level) AS (' +
                        `SELECT d1.id, d1.link, d1.old_version, d1."parentId", d1.info, d1."date", d1.number, d1."categoryId", 1 FROM documents d1 WHERE d1.id = :nodeId ${user ? '' : 'AND d1.visibility = :visibility'} ` +
                        'UNION ALL ' +
                        'SELECT d.id, d.link, d.old_version, d."parentId", d.info, d."date", d.number, d."categoryId", level+1 ' +
                        'FROM documents d, sub_documents sd ' +
                        `WHERE d."parentId" = sd.id ${date ? 'AND d.date < :date' : ''}) ` +
                        'SELECT sd2.id, sd2.link, sd2.old_version, sd2."parentId", sd2.info, sd2."date", sd2.number, sd2."categoryId", title, sd2.level ' +
                        'FROM sub_documents sd2 ' +
                        'inner join categories on sd2."categoryId"=categories."id" ' +
                        'ORDER BY level ASC, id ASC;',
                        {replacements: { nodeId: id, visibility: true, date: date ? new Date(date) : '' }, type: QueryTypes.SELECT, mapToModel: true });

                    const response: GetDocumentDto = {
                        fileName: '',
                        info: '',
                    };
                    const documentParser = new DocumentParser();
                    const resultDocument: FormattedDocumentDto = await documentParser.format(await buildDocumentTree(documents, id));
                    response.fileName = resultDocument.resultedFileName;
                    response.info = resultDocument.info;
                    if (user) {
                        response.bookmarks =  await this.bookmarkRepository.findOne({ where: { userId: user.id, docId: id } });
                    }
                    return response;
                } else {
                    const response: GetDocumentDto = {
                        fileName: '',
                        info: '',
                    };
                    const documentParser = new DocumentParser();
                    const resultDocument: FormattedDocumentDto = await documentParser.format(await buildDocumentTree([document], id));
                    response.fileName = resultDocument.resultedFileName;
                    response.info = resultDocument.info;
                    if (user) {
                        response.bookmarks =  await this.bookmarkRepository.findOne({ where: { userId: user.id, docId: id } });
                    }
                    return response;
                }
            } else {
                const response: GetDocumentDto = {
                    fileName: path.basename(document.link),
                    info: document.info,
                };
                if (user) {
                    response.bookmarks =  await this.bookmarkRepository.findOne({ where: { userId: user.id, docId: id } });
                }
                return response;
            }
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

        return {
            ...documentProps,
            date: document.date,
        };
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
            } else if (fs.existsSync(path.resolve(process.env.DOCUMENT_STORAGE, fileName))) {
                return fs.createReadStream(path.resolve(process.env.DOCUMENT_STORAGE, fileName));
            } else if (fileName === WAIT_DOC_NAME) {
                return fs.createReadStream(process.env.WAIT_DOC_PAGE);
            } else if (fileName === BAD_DOC_NAME) {
                return fs.createReadStream(process.env.BAD_DOC_PAGE);
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
        let transaction;
        try {
            transaction = await this.documentRepository.sequelize.transaction();
            const oldDoc = await this.documentRepository.findOne({ where: {id: document.id} });
            if (oldDoc) {
                if (filePath) {
                    Utils.deleteIfExist(oldDoc.link);
                }

                if (document.deleteChilds.toString() === 'true') {
                    await this.documentRepository.destroy({ where: { parentId: oldDoc.id }, transaction });
                }

                const updatedDoc = await oldDoc.update({
                    title: document.title ? document.title : oldDoc.title,
                    ownerId,
                    parentId: document.parentId ? document.parentId : oldDoc.parentId,
                    info: document.info ? document.info : oldDoc.info,
                    categoryId: document.categoryId ? document.categoryId : oldDoc.categoryId,
                    active: document.active ? document.active : oldDoc.active,
                    number: document.number ? Utils.prettifyDocumentNumber(document.number) : oldDoc.number,
                    visibility: document.visibility ? document.visibility : oldDoc.visibility,
                    link: filePath ? filePath : oldDoc.link,
                    renew: document.renew ? document.renew : oldDoc.renew,
                    date: document.date ? new Date(document.date) : oldDoc.date,
                }, { transaction });
                transaction.commit();
                return updatedDoc;
            } else {
                transaction.rollback();
                return new HttpException(`Document with id ${document.id} doesn\`t exist.`, HttpStatus.BAD_REQUEST);
            }
        } catch (error) {
            transaction.rollback();
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
