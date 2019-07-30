import * as cheerio from "cheerio";
import * as Zip from 'adm-zip';
import * as convert from "xml2js";
import { Document } from "./entities/document.entity";
import {Inject, Injectable} from "@nestjs/common";
import BookmarkData from "./data/bookmark.data";
import {BOOKMARK_NAME_PATTERN, BOOKMARK_NAME_SELECTOR, BOOKMARK_TEXT_SELECTOR} from "../common/constants";

@Injectable()
export default class DocumentParser {
    private xmlParser: convert.Parser;
    private formatedDocument: string;

    constructor(@Inject('DocumentRepository') private readonly documentRepository: typeof Document) {
        this.xmlParser = new convert.Parser();
    }

    public async format(document: Document): Promise<string> {
        this.formatedDocument = await this.extractDocument(document.link);

        const childrens = await this.documentRepository.findAll({
            where: { parentId: document.id },
            attributes: ['link']
        });

        for (const child of childrens) {
            const bookmarks: Array<BookmarkData> = await this.getChildBookmarks(child.link)
            await this.setMainBookmarks(bookmarks);
        }
    }

    private async setMainBookmarks(bookmarks: Array<BookmarkData>): Promise<void> {
        const $ = cheerio.load(this.formatedDocument, {xmlMode: true});

        $('w\\:bookmarkStart').each(async (i, el) => {
            if (el.attribs[BOOKMARK_NAME_SELECTOR].match(new RegExp(BOOKMARK_NAME_PATTERN))) {
                let node = el;
                while (node.tagName !== BOOKMARK_TEXT_SELECTOR) {
                    node = node.next ? node.next : node;
                }
                $(node).text('Hello World');
            }
        });

        this.formatedDocument = $.html();
    }

    private async getChildBookmarks(docPath: string): Promise<Array<BookmarkData>> {
        const bookmarks: Array<BookmarkData> = [];
        const xml = await this.extractDocument(docPath);
        const $ = cheerio.load(xml, {xmlMode: true});

        $('w\\:bookmarkStart').each((i, el) => {
            if (el.attribs[BOOKMARK_NAME_SELECTOR].match(new RegExp(BOOKMARK_NAME_PATTERN))) {
                let node = el;

                while (node.tagName !== BOOKMARK_TEXT_SELECTOR) {
                    if (node.next) {
                        node = node.next;
                    } else {
                        break;
                    }
                }

                bookmarks.push({
                    name: el.attribs[BOOKMARK_NAME_SELECTOR],
                    text: $(node).text(),
                });
            }
        });

        return bookmarks;
    }

    private async extractDocument(docPath: string): Promise<string> {
        const zip = new Zip(docPath);
        return await zip.readAsText('word/document.xml');
    }
}
