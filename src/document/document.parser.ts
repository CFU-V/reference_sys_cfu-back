import * as cheerio from "cheerio";
import * as Zip from 'adm-zip';
import * as convert from "xml2js";
import { Document } from "./entities/document.entity";
import BookmarkData from './data/bookmark.data';
import {
    BOOKMARK_END_SELECTOR, BOOKMARK_END_SELECTOR_TEXT, BOOKMARK_ID_SELECTOR_TEXT,
    BOOKMARK_NAME_PATTERN,
    BOOKMARK_NAME_SELECTOR_TEXT, BOOKMARK_R_SELECTOR_TEXT, BOOKMARK_START_SELECTOR,
    BOOKMARK_TEXT_SELECTOR, DOCX_TPM_FOLDER_PATH, DOCX_XML_PATH,
} from '../common/constants';
import * as path from "path";
import { DocumentRecursiveDto, DocumentTreeDto } from "./dto/document.tree.dto";
import { FormattedDocumentDto } from "./dto/document.dto";
import * as textract from 'textract';
import fs from 'fs';
import {QueryTypes} from "sequelize";
import {buildDocumentTree} from "../core/TreeBuilder";

const cheerioOptions = {decodeEntities: false, xmlMode: true};

export default class DocumentParser {
    private xmlParser: convert.Parser;

    constructor() {
        this.xmlParser = new convert.Parser();
    }

    public async format(documentsTree: DocumentTreeDto): Promise<FormattedDocumentDto> {
        // const childs = await this.documentRepository.findAll({
        //     where: { parentId: this.document.id },
        //     attributes: ['link'],
        //     order: [['id', 'asc']]
        // });
        const zip = new Zip(documentsTree.link);
        let formattedDocument: FormattedDocumentDto = {
            id: documentsTree.id,
            link: documentsTree.link,
            parentId: documentsTree.parentId,
            level: documentsTree.level,
            formatted: await cheerio.load(zip.readAsText(DOCX_XML_PATH), cheerioOptions)
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
                });
                formattedDocument.formatted = await this.setMainBookmarks(formattedDocument.formatted, bookmarks);
            }
        }

        await this.saveDocx(zip, formattedDocument.formatted, documentsTree);
        return formattedDocument;
    }

    public async extract(docPath: string, documentsTree: DocumentTreeDto): Promise<string> {
        await this.format(documentsTree);
        return new Promise(async (resolve, reject) => {
            textract.fromFileWithPath(this.getPathForTempDocument(docPath), (error, text) => {
                if (error) reject(error);
                resolve(text);
                fs.unlinkSync(this.getPathForTempDocument(docPath));
            });
        });
    }

    private async setMainBookmarks(formattedDocument: CheerioStatic, bookmarks: Array<BookmarkData>): Promise<CheerioStatic> {
        const bookmarkElements: Array<CheerioElement> = [];

        formattedDocument(BOOKMARK_START_SELECTOR).each(async (i, el) => {
            bookmarkElements.push(el);
        });

        for (const el of bookmarkElements) {
            if (bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR_TEXT]]) {
                const replacedPart = await this.getTextRec(formattedDocument, el);

                if (replacedPart) {
                    const xml = formattedDocument.xml();
                    formattedDocument = cheerio.load(
                        xml.replace(replacedPart, bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR_TEXT]].text),
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

    // private async getText($: CheerioStatic, node: CheerioElement): Promise<string> {
    //     const id = node.attribs[BOOKMARK_ID_SELECTOR_TEXT];
    //     let text = '';
    //
    //     while (node.tagName !== BOOKMARK_END_SELECTOR && node.attribs[BOOKMARK_ID_SELECTOR_TEXT] !== id) {
    //         if (node.next) {
    //             node = node.next;
    //             if (node.tagName === 'w:p') {
    //
    //             }
    //             if (node.tagName === BOOKMARK_R_SELECTOR_TEXT) {
    //                 text += $(node).toString();
    //             }
    //         } else {
    //             node = node.parent;
    //             node = node.next;
    //         }
    //     }
    //
    //     return text;
    // }

    private async getTextRec($: CheerioStatic, node: CheerioElement, id?: string): Promise<string> {
        id = id ? id : node.attribs[BOOKMARK_ID_SELECTOR_TEXT];
        let text = '';

        if (node.tagName !== BOOKMARK_END_SELECTOR || node.attribs[BOOKMARK_ID_SELECTOR_TEXT] !== id) {
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

        return text;
    }

    private async extractDocument(docPath: string): Promise<string> {
        const zip = new Zip(docPath);
        return await zip.readAsText(DOCX_XML_PATH);
    }

    private async saveDocx(zip: Zip, formattedDocument: CheerioStatic, document: DocumentRecursiveDto): Promise<void> {
        await zip.addFile(DOCX_XML_PATH, Buffer.from(formattedDocument.xml()));
        await zip.writeZip(path.resolve(__dirname, `${DOCX_TPM_FOLDER_PATH}/${path.basename(document.link)}`));
    }

    private getPathForTempDocument(docPath: string) : string {
        return path.resolve(__dirname, `${DOCX_TPM_FOLDER_PATH}/${path.basename(docPath)}`);
    }
}
