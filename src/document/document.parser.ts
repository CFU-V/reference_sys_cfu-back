import * as cheerio from 'cheerio';
import * as Zip from 'adm-zip';
import * as convert from 'xml2js';
import DocumentMerger from './lib/document.merger';
// import DocumentMerger from './lib/mergeLib';
import {
    CORE_XML_PATH,
    DOCX_TPM_FOLDER_PATH,
    DOCX_XML_PATH,
    RELS_XML_PATH,
    PROPERTY_FIELDS,
} from '../common/constants';
import * as path from 'path';
import { DocumentRecursiveDto, DocumentTreeDto } from './dto/document.tree.dto';
import { FormattedDocumentDto } from './dto/document.dto';
import * as textract from 'textract';
import Utils from '../core/Utils';
import { Document } from './entities/document.entity';
import { HttpException } from '@nestjs/common';
import { BodyDocumentPropertyDto } from './dto/document.body.property.dto';
import { IExtractedDocument } from './interfaces/extractedDocument';

const cheerioOptions = {decodeEntities: false, xmlMode: true, normalizeTags: true, normalizeWhitespace: true};

export default class DocumentParser {
    private xmlParser: convert.Parser;
    private merger: DocumentMerger;

    constructor() {
        this.xmlParser = new convert.Parser();
        this.merger = new DocumentMerger();
    }

    public async format(documentsTree: DocumentTreeDto): Promise<FormattedDocumentDto> {
        try {
            const zip = new Zip(documentsTree.link);
            const formattedDocument: FormattedDocumentDto = {
                id: documentsTree.id,
                link: documentsTree.link,
                info: documentsTree.info,
                parentId: documentsTree.parentId,
                old_version: documentsTree.old_version,
                level: documentsTree.level,
                formatted: cheerio.load(zip.readAsText(DOCX_XML_PATH), cheerioOptions),
                relsXml: zip.readAsText(RELS_XML_PATH),
                resultedFileName: null,
            };
            zip.deleteFile(DOCX_XML_PATH);
            zip.deleteFile(RELS_XML_PATH);

            if (documentsTree.childrens.length > 0) {
                for (const child of documentsTree.childrens) {
                    if (child.childrens.length > 0) {
                        const resultedChild: FormattedDocumentDto = await this.format(child);
                        this.merger.load(formattedDocument.formatted.xml(), formattedDocument.relsXml);
                        const mergeResult = this.merger.start([resultedChild.formatted.xml()], [resultedChild.relsXml]);
                        formattedDocument.formatted = cheerio.load(mergeResult.document, cheerioOptions);
                        formattedDocument.relsXml = mergeResult.linksDocument;
                    } else {
                        this.merger.load(formattedDocument.formatted.xml(), formattedDocument.relsXml);
                        const extractedDoc = await this.extractDocument(child.link);
                        const mergeResult = this.merger.start([extractedDoc.document], [extractedDoc.rels]);
                        formattedDocument.formatted = cheerio.load(mergeResult.document, cheerioOptions);
                        formattedDocument.relsXml = mergeResult.linksDocument;
                        if (formattedDocument.old_version) {
                            formattedDocument.formatted = await this.setOldVersion(formattedDocument.old_version, formattedDocument.formatted);
                            formattedDocument.old_version = null;
                        }
                    }
                }
            } else {
                if (formattedDocument.old_version) {
                    formattedDocument.formatted = await this.setOldVersion(formattedDocument.old_version, formattedDocument.formatted);
                    formattedDocument.old_version = null;
                }
            }

            formattedDocument.resultedFileName = await this.saveDocx(zip, formattedDocument.formatted, formattedDocument.relsXml, documentsTree);
            return formattedDocument;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    public async extract(doc: Document, documentsTree: DocumentTreeDto): Promise<string> {
        try {
            let docPath = doc.link;
            if (!doc.parentId) {
                await this.format(documentsTree);
                docPath = this.getPathForTempDocument(doc.link);
            }
            return new Promise(async (resolve, reject) => {
                textract.fromFileWithPath(docPath, (error, text) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(text);
                    if (doc.parentId) {
                        Utils.deleteIfExist(this.getPathForTempDocument(doc.link));
                    }
                });
            });
        } catch (error) {
            throw error;
        }
    }

    public async getProps(link: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const propsXml = await this.extractDocumentProperty(link);
                const $ = await cheerio.load(propsXml, cheerioOptions);
                const propJson = {};
                for (const propSelector of Object.keys(PROPERTY_FIELDS)) {
                    propJson[PROPERTY_FIELDS[propSelector]] = $(propSelector).text();
                }
                resolve(propJson);
            } catch (error) {
                reject(error);
            }
        });
    }

    public async setOldVersion(oldVersion: number, $: CheerioStatic): Promise<CheerioStatic> {
        try {
            let str = $.xml();
            const endIndex = str.indexOf('<w:body>') + '<w:body>'.length;
            str = str.slice(0, endIndex) +
                '<w:p>' +
                '<w:r>' +
                '<w:rPr>' +
                '<w:lang w:val="ru-RU"/>' +
                '</w:rPr>' +
                `<w:t>Старая версия ${process.env.APP_URL}/documents/${oldVersion}</w:t>` +
                '</w:r>' +
                '</w:p>' +
                str.slice(endIndex);
            return cheerio.load(str, cheerioOptions);
        } catch (error) {
            throw error;
        }
    }

    public async setProps(document: Document, props: BodyDocumentPropertyDto): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const propsXml = await this.extractDocumentProperty(document.link);
                const $ = await cheerio.load(propsXml, cheerioOptions);
                for (const propSelector of Object.keys(PROPERTY_FIELDS)) {
                    if (props[PROPERTY_FIELDS[propSelector]]) {
                        if (
                            PROPERTY_FIELDS[propSelector] === 'createdAt' ||
                            PROPERTY_FIELDS[propSelector] === 'updatedAt'
                        ) {
                            if (!Number(props[PROPERTY_FIELDS[propSelector]])) {
                                return new HttpException(`${props[PROPERTY_FIELDS[propSelector]]} must be timestamp`, 500);
                            }

                            $(propSelector)
                                .text(
                                    new Date(new Date(Number(props[PROPERTY_FIELDS[propSelector]]))
                                        .toString()
                                        .split('GMT')[0] + ' UTC')
                                        .toISOString()
                                        .split('.')[0] + 'Z');
                        } else {
                            $(propSelector).text(props[PROPERTY_FIELDS[propSelector]]);
                        }
                    }
                }
                await this.saveDocumentProperty($, document);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    private async extractDocument(docPath: string): Promise<IExtractedDocument> {
        const zip = new Zip(docPath);
        const document = await zip.readAsText(DOCX_XML_PATH);
        const rels = await zip.readAsText(RELS_XML_PATH);
        return { document, rels };
    }

    private async extractDocumentProperty(docPath: string): Promise<string> {
        const zip = new Zip(docPath);
        return await zip.readAsText(CORE_XML_PATH);
    }

    private async saveDocx(zip: Zip, formattedDocument: CheerioStatic, rels: string, document: DocumentRecursiveDto): Promise<string> {
        const link = path.resolve(__dirname, `${DOCX_TPM_FOLDER_PATH}/${path.basename(document.link)}`);
        await zip.addFile(DOCX_XML_PATH, Buffer.from(formattedDocument.xml()));
        await zip.addFile(RELS_XML_PATH, Buffer.from(rels));
        await zip.writeZip(link);
        return path.basename(document.link);
    }

    private async saveDocumentProperty(props: CheerioStatic, document: Document): Promise<void> {
        const zip = new Zip(document.link);
        const link = path.resolve(document.link);
        await zip.deleteFile(CORE_XML_PATH);
        await zip.addFile(CORE_XML_PATH, Buffer.from(props.xml()));
        await zip.writeZip(link);
    }

    private getPathForTempDocument(docPath: string): string {
        try {
            return path.resolve(__dirname, `${DOCX_TPM_FOLDER_PATH}/${path.basename(docPath)}`);
        } catch (error) {
            throw error;
        }
    }
}
