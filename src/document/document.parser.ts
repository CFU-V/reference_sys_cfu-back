import * as cheerio from "cheerio";
import * as Zip from 'adm-zip';
import * as convert from "xml2js";
import { Document } from "./entities/document.entity";
import BookmarkData from './data/bookmark.data';
import {
    BOOKMARK_END_SELECTOR, BOOKMARK_ID_SELECTOR,
    BOOKMARK_NAME_PATTERN,
    BOOKMARK_NAME_SELECTOR, BOOKMARK_R_SELECTOR, BOOKMARK_START_SELECTOR,
    BOOKMARK_TEXT_SELECTOR, DOCX_TPM_FOLDER_PATH, DOCX_XML_PATH
} from '../common/constants';
import * as path from "path";
import { DocumentRecursiveDto, DocumentTreeDto } from "./dto/document.tree.dto";
import {FormattedDocumentDto} from "./dto/document.dto";

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

    private async setMainBookmarks(formattedDocument: CheerioStatic, bookmarks: Array<BookmarkData>): Promise<CheerioStatic> {
        await formattedDocument(BOOKMARK_START_SELECTOR).each(async (i, el) => {
            if (bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR]]) {
                //let node = await this.findNode(formattedDocument, el);
                //if (node) {
                    formattedDocument(el).replaceWith(bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR]].text);
                //}
            }
        });

        return formattedDocument;
    }

    private async getChildBookmarks(document: FormattedDocumentDto): Promise<Array<BookmarkData>> {
        const bookmarks: Array<BookmarkData> = [];
        const xml = document.formatted ? document.formatted.xml() : await this.extractDocument(document.link);
        const $ = cheerio.load(xml, cheerioOptions);

        await $(BOOKMARK_START_SELECTOR).each(async (i, el) => {
            if (el.attribs[BOOKMARK_NAME_SELECTOR].match(new RegExp(BOOKMARK_NAME_PATTERN))) {
                let text = await this.getText($, el);

                if (text) {
                    if (!bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR]]) {
                        bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR]] = {
                            name: el.attribs[BOOKMARK_NAME_SELECTOR],
                            text
                        };
                    }
                }
            }
        });
        return bookmarks;
    }

    private async getText($: CheerioStatic, node: CheerioElement): Promise<string> {
        const id = node.attribs[BOOKMARK_ID_SELECTOR];
        let text = '';

        while (node.tagName !== BOOKMARK_END_SELECTOR && node.attribs[BOOKMARK_ID_SELECTOR] !== id) {
            if (node.next) {
                node = node.next;
                if (node.tagName === 'w:p') {
                    
                }
                if (node.tagName === BOOKMARK_R_SELECTOR) {
                    text += $(node).toString();
                }
            } else {
                node = node.parent;
                node = node.next;
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
}
