import {IDocumentBookmark} from "./document.bookmark.interface";
import { Element, ElementCompact} from 'xml-js';

export interface IMergedDocumentData {
    bookmarks: IDocumentBookmark[];
    paragraphs: Element | ElementCompact;
}
