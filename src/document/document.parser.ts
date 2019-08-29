import * as cheerio from 'cheerio';
import * as Zip from 'adm-zip';
import * as convert from 'xml2js';
import BookmarkData from './data/bookmark.data';
import {
    BOOKMARK_END_SELECTOR, BOOKMARK_END_SELECTOR_TEXT, BOOKMARK_ID_SELECTOR, BOOKMARK_ID_SELECTOR_TEXT,
    BOOKMARK_NAME_PATTERN, BOOKMARK_NAME_SELECTOR,
    BOOKMARK_NAME_SELECTOR_TEXT, BOOKMARK_R_SELECTOR_TEXT, BOOKMARK_START_SELECTOR, BOOKMARK_START_SELECTOR_TEXT,
    BOOKMARK_TEXT_SELECTOR, CORE_XML_PATH, DOCX_TPM_FOLDER_PATH, DOCX_XML_PATH, PROPERTY_FIELDS,
} from '../common/constants';
import * as path from 'path';
import { DocumentRecursiveDto, DocumentTreeDto } from './dto/document.tree.dto';
import { FormattedDocumentDto } from './dto/document.dto';
import * as textract from 'textract';
import Utils from '../core/Utils';
import * as fsxml from 'fast-xml-parser';
import * as xml2js from 'xml2js';
import { Document } from './entities/document.entity';
import { errorObject } from 'rxjs/internal-compatibility';
import { DocumentPropertyDto } from './dto/document.property.dto';
import { HttpException } from '@nestjs/common';
import { BodyDocumentPropertyDto } from './dto/document.body.property.dto';

const cheerioOptions = {decodeEntities: false, xmlMode: true, normalizeTags: true, normalizeWhitespace: true};

export default class DocumentParser {
    private xmlParser: convert.Parser;

    constructor() {
        this.xmlParser = new convert.Parser();
    }

    public async formatLite(documentsTree: DocumentTreeDto): Promise<FormattedDocumentDto> {
        const zip = new Zip(documentsTree.link);
        const formattedDocument: FormattedDocumentDto = {
            id: documentsTree.id,
            link: documentsTree.link,
            parentId: documentsTree.parentId,
            level: documentsTree.level,
            formatted: await cheerio.load(zip.readAsText(DOCX_XML_PATH), cheerioOptions),
            resultedFileName: null,
        };
        zip.deleteFile(DOCX_XML_PATH);

        for (const child of documentsTree.childrens) {
            if (child.childrens.length > 0) {
                const resultedChild: FormattedDocumentDto = await this.formatLite(child);
                const childBody = await this.getChildBody(resultedChild);
                formattedDocument.formatted = await this.setChildBody(formattedDocument.formatted, childBody);
            } else {
                const childBody = await this.getChildBody({
                    id: child.id,
                    parentId: child.parentId,
                    level: child.level,
                    link: child.link,
                    formatted: null,
                    resultedFileName: null,
                });
                formattedDocument.formatted = await this.setChildBody(formattedDocument.formatted, childBody);
            }
        }

        formattedDocument.resultedFileName = await this.saveDocx(zip, formattedDocument.formatted, documentsTree);
        return formattedDocument;
    }

    public async format(documentsTree: DocumentTreeDto): Promise<FormattedDocumentDto> {
        const zip = new Zip(documentsTree.link);
        const formattedDocument: FormattedDocumentDto = {
            id: documentsTree.id,
            link: documentsTree.link,
            parentId: documentsTree.parentId,
            level: documentsTree.level,
            formatted: await cheerio.load(zip.readAsText(DOCX_XML_PATH), cheerioOptions),
            resultedFileName: null,
        };
        zip.deleteFile(DOCX_XML_PATH);

        for (const child of documentsTree.childrens) {
            if (child.childrens.length > 0) {
                const resultedChild: FormattedDocumentDto = await this.format(child);
                const bookmarks: Array<BookmarkData> = await this.getChildBookmarks(resultedChild);
                formattedDocument.formatted = await this.setMainBookmarks(formattedDocument.formatted, bookmarks);
            } else {
                const bookmarks: Array<BookmarkData> = await this.getChildBookmarks({
                    id: child.id,
                    parentId: child.parentId,
                    level: child.level,
                    link: child.link,
                    formatted: null,
                    resultedFileName: null,
                });
                formattedDocument.formatted = await this.setMainBookmarks(formattedDocument.formatted, bookmarks);
            }
        }

        formattedDocument.resultedFileName = await this.saveDocx(zip, formattedDocument.formatted, documentsTree);
        return formattedDocument;
    }

    public async extract(docPath: string, documentsTree: DocumentTreeDto): Promise<string> {
        try {
            await this.format(documentsTree);
            return new Promise(async (resolve, reject) => {
                textract.fromFileWithPath(this.getPathForTempDocument(docPath), (error, text) => {
                    if (error) reject(error);
                    resolve(text);
                    Utils.deleteIfExist(this.getPathForTempDocument(docPath));
                });
            });
        } catch (error) {
            console.log(error);
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
                console.log(error);
                reject(error);
            }
        });
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
                console.log(error);
                reject(error);
            }
        });
    }

    private async setMainBookmarks(formattedDocument: CheerioStatic, bookmarks: Array<BookmarkData>): Promise<CheerioStatic> {
        const bookmarkElements: Array<CheerioElement> = [];

        formattedDocument(BOOKMARK_START_SELECTOR).each(async (i, el) => {
            bookmarkElements.push(el);
        });

        for (const el of bookmarkElements) {
            if (bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR_TEXT]]) {
                const replacedPart =
                        `<${BOOKMARK_START_SELECTOR_TEXT} ` +
                        `${BOOKMARK_ID_SELECTOR_TEXT}="${el.attribs[BOOKMARK_ID_SELECTOR_TEXT]}" ` +
                        `${BOOKMARK_NAME_SELECTOR_TEXT}="${el.attribs[BOOKMARK_NAME_SELECTOR_TEXT]}"/>` +
                        `${await this.getTextRec(formattedDocument, el, null, true)}` +
                        `<${BOOKMARK_END_SELECTOR_TEXT} ` +
                        `${BOOKMARK_ID_SELECTOR_TEXT}="${el.attribs[BOOKMARK_ID_SELECTOR_TEXT]}"/>`;

                //console.log('REPLACED: ' + replacedPart);

                const xml = formattedDocument.xml();
                if (xml.indexOf(replacedPart) !== -1) {
                    let valid = bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR_TEXT]].text;

                    if (fsxml.validate(bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR_TEXT]].text) !== true) {
                        valid = cheerio.load(bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR_TEXT]].text, cheerioOptions);
                    }
                    //console.log('VALID: ' + typeof valid === 'string' ? valid : valid.xml());

                    formattedDocument = cheerio.load(
                        xml.replace(replacedPart, typeof valid === 'string' ? valid : valid.xml()),
                        cheerioOptions,
                    );
                }
            }
        }

        return formattedDocument;
    }

    private async getChildBookmarks(document: FormattedDocumentDto): Promise<Array<BookmarkData>> {
        const bookmarks: Array<BookmarkData> = [];
        const bookmarkElements: Array<CheerioElement> = [];
        const xml = document.formatted ? document.formatted.xml() : await this.extractDocument(document.link);
        const $ = cheerio.load(xml, cheerioOptions);

        $(BOOKMARK_START_SELECTOR).each(async (i, el) => {
            bookmarkElements.push(el);
        });

        for (const el of bookmarkElements) {
            if (el.attribs[BOOKMARK_NAME_SELECTOR_TEXT].match(new RegExp(BOOKMARK_NAME_PATTERN))) {
                const text = await this.getTextRec($, el);

                if (text) {
                    if (!bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR_TEXT]]) {
                        bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR_TEXT]] = {
                            name: el.attribs[BOOKMARK_NAME_SELECTOR_TEXT],
                            text,
                        };
                    }
                }
            }
        }

        return bookmarks;
    }

    private async getChildBody(document: FormattedDocumentDto): Promise<Cheerio> {
        const xml = document.formatted ? document.formatted.xml() : await this.extractDocument(document.link);
        const $ = cheerio.load(xml, cheerioOptions);
        return $('w\\:body').children();
    }

    private async setChildBody(formattedDocument: CheerioStatic, childBody: Cheerio): Promise<CheerioStatic> {
        let str = formattedDocument.xml();
        const endIndex = str.indexOf('</w:body>');
        str = str.slice(0, endIndex) + '<w:br w:type="page"/>' + childBody.toString() + str.slice(endIndex)
        return await cheerio.load(str, cheerioOptions);
    }

    private async getTextRec($: CheerioStatic, node: CheerioElement, id?: string, replaced?: boolean)  {
        id = id ? id : node.attribs[BOOKMARK_ID_SELECTOR_TEXT];
        let text = '';
        let additionalBookmarks = '';

        if (node.tagName !== BOOKMARK_END_SELECTOR_TEXT || node.attribs[BOOKMARK_ID_SELECTOR_TEXT] !== id) {
            if (node.tagName === BOOKMARK_END_SELECTOR_TEXT) {
                const tmp = $(`${BOOKMARK_START_SELECTOR}[${BOOKMARK_ID_SELECTOR}="${node.attribs[BOOKMARK_ID_SELECTOR_TEXT]}"]`);
                if (tmp.attr()) {
                    if (tmp.attr(BOOKMARK_NAME_SELECTOR_TEXT).match(new RegExp(BOOKMARK_NAME_PATTERN))) {
                        additionalBookmarks += $(node).toString();
                    }
                }
            }
            if (node.next) {
                node = node.next;
                const endIndex = $(node).toString().indexOf(`<${BOOKMARK_END_SELECTOR_TEXT} ${BOOKMARK_ID_SELECTOR_TEXT}=\"${id}\"`);
                if (endIndex !== -1) {
                    text += $(node).toString().substring(0, endIndex);
                } else {
                    text += $(node).toString();
                    text += await this.getTextRec($, node, id);
                }
            } else {
                node = node.parent;
                if (text.indexOf(`</${node.tagName}>`) === -1) {
                    text += `</${node.tagName}>`;
                }
                if (node.next) {
                    text += await this.getTextRec($, node, id);
                } else {
                    const endIndex = $(node).toString().indexOf(`<${BOOKMARK_END_SELECTOR_TEXT} ${BOOKMARK_ID_SELECTOR_TEXT}=\"${id}\"`);
                    if (endIndex !== -1) {
                        text += $(node).toString().substring(0, endIndex);
                    } else {
                        text += $(node).toString();
                    }
                }
            }
        }

        if (replaced) {
            return text;
        } else {
            // console.log('replaced: ' + replaced + ' ' + additionalBookmarks)
            // if (additionalBookmarks !== '') {
            //     text += additionalBookmarks;
            // }
            return text;
        }
    }

    private async extractDocument(docPath: string): Promise<string> {
        const zip = new Zip(docPath);
        return await zip.readAsText(DOCX_XML_PATH);
    }

    private async extractDocumentProperty(docPath: string): Promise<string> {
        const zip = new Zip(docPath);
        return await zip.readAsText(CORE_XML_PATH);
    }

    private async saveDocx(zip: Zip, formattedDocument: CheerioStatic, document: DocumentRecursiveDto): Promise<string> {
        const link = path.resolve(__dirname, `${DOCX_TPM_FOLDER_PATH}/${path.basename(document.link)}`);
        await zip.addFile(DOCX_XML_PATH, Buffer.from(formattedDocument.xml()));
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
            console.log(error);
            throw error;
        }
    }
}
