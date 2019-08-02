import * as cheerio from "cheerio";
import * as Zip from 'adm-zip';
import * as convert from "xml2js";
import { Document } from "./entities/document.entity";
import BookmarkData from './data/bookmark.data';
import {
    BOOKMARK_NAME_PATTERN,
    BOOKMARK_NAME_SELECTOR, BOOKMARK_R_SELECTOR, BOOKMARK_SELECTOR,
    BOOKMARK_TEXT_SELECTOR, DOCX_TPM_FOLDER_PATH, DOCX_XML_PATH
} from '../common/constants';
import * as path from "path";

const cheerioOptions = {decodeEntities: false, xmlMode: true};

export default class DocumentParser {
    private xmlParser: convert.Parser;
    private readonly formattedDocument: CheerioStatic;
    private zip: Zip;
    private document: Document;

    constructor(private readonly documentRepository: typeof Document, document: Document) {
        this.xmlParser = new convert.Parser();
        this.zip = new Zip(document.link);
        this.document = document;
        this.formattedDocument = cheerio.load(this.zip.readAsText(DOCX_XML_PATH), cheerioOptions);
        this.zip.deleteFile(DOCX_XML_PATH);
    }

    public async format(): Promise<string> {
        const childs = await this.documentRepository.findAll({
            where: { parentId: this.document.id },
            attributes: ['link'],
            order: [['id', 'asc']]
        });

        for (const child of childs) {
            const bookmarks: Array<BookmarkData> = await this.getChildBookmarks(child.link);
            await this.setMainBookmarks(bookmarks);
        }

        await this.saveDocx();
        return this.formattedDocument.xml();
    }

    private async setMainBookmarks(bookmarks: Array<BookmarkData>): Promise<void> {
        this.formattedDocument(BOOKMARK_SELECTOR).each(async (i, el) => {
            if (bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR]]) {
                let node = await this.findNode(this.formattedDocument, el);
                if (node) {
                    this.formattedDocument(node).text(bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR]].text);
                }
            }
        });
    }

    private async getChildBookmarks(docPath: string): Promise<Array<BookmarkData>> {
        const bookmarks: Array<BookmarkData> = [];
        const xml = await this.extractDocument(docPath);
        const $ = cheerio.load(xml, cheerioOptions);

        await $(BOOKMARK_SELECTOR).each(async (i, el) => {
            if (el.attribs[BOOKMARK_NAME_SELECTOR].match(new RegExp(BOOKMARK_NAME_PATTERN))) {
                let node = await this.findNode($, el);

                if (node) {
                    if (!bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR]]) {
                        bookmarks[el.attribs[BOOKMARK_NAME_SELECTOR]] = {
                            name: el.attribs[BOOKMARK_NAME_SELECTOR],
                            text: $(node).text(),
                        }
                    }
                }
            }
        });
        return bookmarks;
    }

    private async findNode($: CheerioStatic, node: CheerioElement): Promise<Cheerio> {
        while (node.tagName !== BOOKMARK_R_SELECTOR) {
            if (node.next) {
                node = node.next;
            } else {
                break;
            }
        }

        return node.tagName === BOOKMARK_R_SELECTOR ? $(node).children(BOOKMARK_TEXT_SELECTOR) : null;
    }

    private async extractDocument(docPath: string): Promise<string> {
        const zip = new Zip(docPath);
        return await zip.readAsText(DOCX_XML_PATH);
    }

    private async saveDocx(): Promise<void> {
        await this.zip.addFile(DOCX_XML_PATH, Buffer.from(this.formattedDocument.xml()));
        await this.zip.writeZip(path.resolve(__dirname, `${DOCX_TPM_FOLDER_PATH}/${path.basename(this.document.link)}`));
    }
}
