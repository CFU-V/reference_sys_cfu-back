import {IDocumentBookmark} from "./document.bookmark.interface";
import { Element } from 'xml-js';

export interface IMergedDocumentData {
    bookmarks: IDocumentBookmark[];
    paragraphs: Element[];
}
