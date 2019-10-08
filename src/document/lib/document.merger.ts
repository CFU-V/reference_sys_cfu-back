import { IMergedDocumentData } from '../interfaces/merged.document.data.interface';
import { IDocumentBookmark } from '../interfaces/document.bookmark.interface';
import * as convert from 'xml-js';
import { IMergedDocument } from '../interfaces/merged.document.interface';
import { isNullOrUndefined } from 'util';

/**
 * Класс для объединения содержимого документов в один главный документ
 */
export default class DocumentMerger {

    /**
     * Инициализация основных переменных класса
     * * document XML главного документа
     * * documentObject XML в виде объекта главного документа
     * * bookmarks закладки в виде массива объектов
     * * paragraphs параграфы в виде массива объектов
     */
    private document: string;
    private documentObject: any;
    private bookmarks: IDocumentBookmark[];
    private paragraphs: convert.Element[];
    private hyperlinks: convert.Element | convert.ElementCompact;

    constructor() {
        this.document = null;
        this.documentObject = null;
        this.bookmarks = Array();
        this.paragraphs = Array();
        this.hyperlinks = null;
    }

    /**
     *
     */
    private checkValidateParams(): boolean {
        if (this.document == null || this.document === '') {
            console.error('[CheckValidateParams] Ошибка! document == null || ""');
            return true;
        }
        if (this.documentObject == null || this.documentObject === '') {
            console.error('[CheckValidateParams] Ошибка! document_object == null || ""');
            return true;
        }
        if (this.bookmarks.length <= 0 || this.bookmarks == null) {
            console.error('[CheckValidateParams] Ошибка! bookmarks <= 0 || null');
            return true;
        }
        if (this.paragraphs.length <= 0 || this.paragraphs == null) {
            console.error('[CheckValidateParams] Ошибка! bookmarks <= 0 || null');
            return true;
        }
        if (this.hyperlinks.elements.length <= 0 || this.hyperlinks == null) {
            console.error('[CheckValidateParams] Ошибка! hyperlinks <= 0 || null');
            return true;
        }
        return false;
    }

    /**
     * объединение всех файлов (дочерних) в главный документ
     * @param {string[]} xmlFiles Массив XML файллов (дочерних)
     * @param {string[]} xmlLinks Массив ссылок XML файллов (дочерних)
     * @returns {void}
     */
    public start(xmlFiles: string[], xmlLinks: string[]): IMergedDocument {
        try {
            this.checkValidateParams();
            for (const [index, xml] of xmlFiles.entries()) {
                const response: IMergedDocumentData = this.getOperation(this.paragraphs, this.bookmarks, xml, xmlLinks[index]);
                this.bookmarks = response.bookmarks;
                this.paragraphs = response.paragraphs;
            }
            this.documentObject.elements[0].elements[0].elements = this.paragraphs;
            const document = convert.js2xml(this.documentObject);
            const linksDocument = convert.js2xml(this.hyperlinks);
            return { document, linksDocument };
        } catch (error) {
            throw Error(`[start] Ошибка при работе с файлом. ${error}`);
        }
    }

    /**
     * Загрузить главный документ
     * @param {string} xml XML документа
     * @param {string} links XML ссылки документа
     * @returns {void}
     */
    public load(xml: string, links: string): void {
        try {
            const parseXmlFile = convert.xml2js(xml, {compact: false, trim: false});
            this.hyperlinks = convert.xml2js(links, {compact: false, trim: false});
            this.document = xml;
            this.documentObject = parseXmlFile;
            this.bookmarks = this.getBookmarks(xml);
            this.paragraphs = this.documentObject.elements[0].elements[0].elements;
            this.checkValidateParams();
            const res: IMergedDocumentData = this.deleteGlobalBookmarks(this.bookmarks, this.paragraphs);
            this.bookmarks = res.bookmarks;
            this.paragraphs = res.paragraphs;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Удалить глобальные закладки (гл. Документ)
     * @returns {void}
     */
    private deleteGlobalBookmarks(bookmarks: IDocumentBookmark[], paragraphs: convert.Element[]): IMergedDocumentData {
        try {
            if (paragraphs.findIndex(i => i.name === 'w:bookmarkEnd') > -1) {
                for (const [i, bookmark] of bookmarks.entries()) {
                    if (bookmark.endInOtherPR || bookmark.endIsMinePR) {
                        continue;
                    }
                    let index = -1;
                    try {
                        index = paragraphs.findIndex(el => ((el === null || el === undefined) ? '' : el.attributes['w:id']) == bookmark.id);
                    } catch (error) {
                        index = -1;
                        console.error(`[DeleteGlobalBookmarks] ${error}`);
                    }

                    if (index > -1) {
                        paragraphs[bookmarks[i].end].elements.push(paragraphs[index]);
                        paragraphs[index] = null;
                        paragraphs.splice(index, 1);
                        bookmarks[i].endIsMinePR = true;
                    }
                }
                return { paragraphs, bookmarks };
            } else {
                return { paragraphs, bookmarks };
            }
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Генерирование уникального ИД ссылкам и добавление ссылок в общий массив ссылок (Main документа)
     * @param {number} start
     * @param {number} end
     * @param {{}[]} paragraphs
     * @param {{}[]} links
     * @returns {{}[]} paragraphs
     */
    computingLinks(
        start: number,
        end: number,
        paragraphs: convert.Element[],
        links: convert.Element | convert.ElementCompact,
    ): convert.Element[] {
        try {
            this.checkValidateParams();
            for (let i = start; i <= end; i++) {
                const maxElements = paragraphs[i].elements.length;
                if (maxElements < 1) {
                    continue;
                }
                for (let j = 0; j < maxElements; j++) {
                    const elementName = paragraphs[i].elements[j].name;
                    if (elementName !== 'w:hyperlink') {
                        continue;
                    }
                    if (
                        paragraphs[i].elements[j].attributes === null ||
                        paragraphs[i].elements[j].attributes === undefined
                    ) {
                        continue;
                    }
                    if (
                        paragraphs[i].elements[j].attributes['r:id'] === null ||
                        paragraphs[i].elements[j].attributes['r:id'] === undefined
                    ) {
                        continue;
                    }
                    const dtNowStamp = new Date();
                    const id = paragraphs[i].elements[j].attributes['r:id'];
                    paragraphs[i].elements[j].attributes['r:id'] = 'rId' + dtNowStamp.getTime().toString();
                    const index = links.elements[0].elements.findIndex(k => k.attributes.Id === id);
                    links.elements[0].elements[index].attributes.Id = 'rId' + dtNowStamp.getTime().toString();
                    this.hyperlinks.elements[0].elements.push(links.elements[0].elements[index]);
                }
            }
            return paragraphs;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Основная функция
     * @param {{}[]} mainParagraphs
     * @param {{}[]} mainBookmarks
     * @param {string} xml
     * @param linksXml
     * @returns {{bookmarks: {}[], paragraphs: {}[]}}
     */
    private getOperation(
        mainParagraphs: convert.Element[],
        mainBookmarks: IDocumentBookmark[],
        xml: string,
        linksXml: string,
    ): IMergedDocumentData {
        // ? #1 Избежать системных закладок и работать с закладками которые есть в обоих файлах
        // ? #2 Если количество параграфов совпадает
        // ? #3 Если в чайлд больше параграфов чем в мейн
        // ? #4 Если в чайлд меньше параграфов чем в мейн
        // !Исправить, после замены параграфов,текстов - заменить ID's на мейн
        try {
            this.checkValidateParams();
            const objectXml = convert.xml2js(xml, {compact: false, trim: false}); // Конвертируем XML в Array of Object;
            const objectLinksXml = convert.xml2js(linksXml, {compact: false, trim: false}); // Конвертируем XML в Array of Object;
            // Удаляем глобальные закладки
            const documentData: IMergedDocumentData = this.deleteGlobalBookmarks(
                this.getBookmarks(xml),
                objectXml.elements[0].elements[0].elements,
            );
            const bookmarksXml = documentData.bookmarks;
            let paragraphsXml = documentData.paragraphs;
            for (const bookmarkXml of bookmarksXml) {
                if (!bookmarkXml.name) {
                    continue; // Это системные закладки
                }

                const mainBookmarkIndex = mainBookmarks.findIndex(i => i.name === bookmarkXml.name);

                if (mainBookmarkIndex === -1) {
                    continue;
                }
                const mainBookmark = mainBookmarks[mainBookmarkIndex];
                paragraphsXml = this.computingLinks(bookmarkXml.start, bookmarkXml.end, paragraphsXml, objectLinksXml);
                if (bookmarkXml.countParagraphs === mainBookmark.countParagraphs) {
                    for (let j = 0; j < mainBookmark.countParagraphs; j++) {
                        if (!(mainParagraphs[mainBookmark.start + j] && paragraphsXml[bookmarkXml.start + j])) {
                            continue;
                        }
                        mainParagraphs[mainBookmark.start + j] = this.replaceTextFromOtherParagraph(
                            mainParagraphs[mainBookmark.start + j],
                            paragraphsXml[bookmarkXml.start + j],
                            true);
                    }
                } else {
                    if (bookmarkXml.countParagraphs > mainBookmark.countParagraphs) {
                        mainParagraphs[mainBookmark.start] = this.replaceTextFromOtherParagraph(
                            mainParagraphs[mainBookmark.start],
                            paragraphsXml[bookmarkXml.start],
                            false,
                        );
                        // ? Если местонахождение закладок с обоих файлах совпадает
                        if (
                            mainBookmark.endInOtherPR === bookmarkXml.endInOtherPR &&
                            mainBookmark.endIsMinePR === bookmarkXml.endIsMinePR
                        ) {
                            const paragraphsCount = bookmarkXml.countParagraphs - mainBookmark.countParagraphs;
                            const PR = this.getRangeParagraphs(
                                paragraphsXml,
                                bookmarkXml.start,
                                bookmarkXml.end,
                            );
                            for (let j = mainBookmark.start + 1; j <= mainBookmark.end; j++) {
                                delete mainParagraphs[j];
                            }
                            mainParagraphs = this.addNewParagraphs(
                                mainParagraphs,
                                PR,
                                mainBookmark.start,
                                mainBookmark.end,
                            );
                            mainBookmarks[mainBookmarkIndex].end += paragraphsCount;
                            mainBookmarks[mainBookmarkIndex].countParagraphs += paragraphsCount;
                            for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                                mainBookmarks[j].start += paragraphsCount;
                                mainBookmarks[j].end += paragraphsCount;
                            }
                            this.deleteBookMarksInLastPR_FIX(mainParagraphs[mainBookmarks[mainBookmarkIndex].end]);
                            // Фикс закладок
                            mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                                .push(
                                    {
                                        attributes: {'w:id': mainBookmarks[mainBookmarkIndex].id },
                                        name: 'w:bookmarkEnd',
                                        type: 'element',
                                    });
                        } else {
                            const paragraphsCount = bookmarkXml.countParagraphs - mainBookmark.countParagraphs;
                            const PR = this.getRangeParagraphs(
                                paragraphsXml,
                                bookmarkXml.start,
                                bookmarkXml.end,
                            );
                            for (let j = mainBookmark.start + 1; j <= mainBookmark.end; j++) {
                                delete mainParagraphs[j];
                            }
                            mainParagraphs = this.addNewParagraphs(
                                mainParagraphs,
                                PR,
                                mainBookmark.start,
                                mainBookmark.end,
                            );
                            mainBookmark.end += paragraphsCount;
                            mainBookmark.countParagraphs += paragraphsCount;
                            for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                                mainBookmarks[j].start += paragraphsCount;
                                mainBookmarks[j].end += paragraphsCount;
                            }
                            this.deleteBookMarksInLastPR_FIX(mainParagraphs[mainBookmark[mainBookmarkIndex].end]);
                            // Фикс закладок
                            if (mainBookmarks[mainBookmarkIndex].endInOtherPR) {
                                const index = mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                                    .findIndex(i => i.name === 'w:bookmarkEnd');
                                if (index > -1) {
                                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements[index] = null;
                                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements.splice(index, 1);
                                }
                            } else {
                                mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                                    .push(
                                        {
                                            attributes: {'w:id': mainBookmarks[mainBookmarkIndex].id},
                                            name: 'w:bookmarkEnd', type: 'element',
                                        });
                            }
                        }
                    } else {
                        mainParagraphs[mainBookmark.start] = this.replaceTextFromOtherParagraph(
                            mainParagraphs[mainBookmark.start],
                            paragraphsXml[mainBookmark.start],
                            false,
                        );

                        if (
                            mainBookmark.endInOtherPR === bookmarkXml.endInOtherPR &&
                            mainBookmark.endIsMinePR === bookmarkXml.endIsMinePR
                        ) {
                            const paragraphsCount = bookmarkXml.countParagraphs - mainBookmark.countParagraphs;
                            for (let j = mainBookmark.start + 1; j <= mainBookmark.end; j++) {
                                mainParagraphs.splice(mainBookmark.start + 1, 1);
                            }
                            if (bookmarkXml.countParagraphs > 1) {
                                const PR = this.getRangeParagraphs(
                                    paragraphsXml,
                                    bookmarkXml.start,
                                    bookmarkXml.end,
                                );
                                mainParagraphs = this.addNewParagraphs(
                                    mainParagraphs,
                                    PR,
                                    mainBookmark.start,
                                    mainBookmark.end,
                                );
                            }
                            mainBookmark.end += paragraphsCount;
                            mainBookmark.countParagraphs += paragraphsCount;
                            for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                                mainBookmarks[j].start += paragraphsCount;
                                mainBookmarks[j].end += paragraphsCount;
                            }
                            // Фикс закладок
                            mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                                .push(
                                    {
                                        attributes: {'w:id': mainBookmarks[mainBookmarkIndex].id},
                                        name: 'w:bookmarkEnd',
                                        type: 'element',
                                    });
                        } else {
                            const paragraphsCount = bookmarkXml.countParagraphs - mainBookmark.countParagraphs;
                            for (let j = mainBookmark.start + 1; j <= mainBookmark.end; j++) {
                                mainParagraphs.splice(mainBookmark.start + 1, 1);
                            }
                            if (bookmarkXml.countParagraphs > 1) {
                                const PR = this.getRangeParagraphs(
                                    paragraphsXml,
                                    bookmarkXml.start,
                                    bookmarkXml.end,
                                );
                                mainParagraphs = this.addNewParagraphs(
                                    mainParagraphs,
                                    PR,
                                    mainBookmark.start,
                                    mainBookmark.end,
                                );
                            }
                            mainBookmark.end += paragraphsCount;
                            mainBookmark.countParagraphs += paragraphsCount;
                            for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                                mainBookmarks[j].start += paragraphsCount;
                                mainBookmarks[j].end += paragraphsCount;
                            }

                            // Фикс закладок
                            if (mainBookmark.endInOtherPR === true) {
                                const index = mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                                    .findIndex(i => i.name === 'w:bookmarkEnd');
                                if (index > -1) {
                                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements[index] = null;
                                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements.splice(index, 1);
                                }
                            } else {
                                mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                                    .push(
                                        {
                                            attributes: {'w:id': mainBookmarks[mainBookmarkIndex].id},
                                            name: 'w:bookmarkEnd',
                                            type: 'element',
                                        });
                            }
                        }
                    }
                }
            }
            return {
                paragraphs: mainParagraphs,
                bookmarks: mainBookmarks,
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Получить массив закладок из гл. Документа
     * @param {string} xml
     * @returns {[]} Возвращает массив закладок из документа
     */
    private getBookmarks(xml: string): IDocumentBookmark[] {
        try {
            const regexBookmarkName = /п_[а-я,0-9,-,_]+/i;
            const regexBookmarkId = /[0-9]+/i;
            const splitDocument = xml.split('<');
            const bookmarks: IDocumentBookmark[] = [];
            let paragraphIsOpen = false;
            let bookMarkIsOpen = false;
            let countParagraphs = -1;
            let fix = -1;
            for (const element of splitDocument) {
                if (element.includes('w:p ')) {
                    countParagraphs++;
                    fix = countParagraphs;
                    paragraphIsOpen = true;
                    bookMarkIsOpen = false;
                } else if (element.includes('/w:p>')) {
                    paragraphIsOpen = false;
                    fix += 1;
                }

                if (element.includes('w:bookmarkStart ')) {
                    bookMarkIsOpen = true;
                    const name = regexBookmarkName.exec(element) !== null ? regexBookmarkName.exec(element)[0] : null;
                    const id = regexBookmarkId.exec(element) !== null ? parseInt(regexBookmarkId.exec(element)[0], 10) : -1;
                    if (id > -1) {
                        bookmarks[id] = {
                            start: countParagraphs,
                            name,
                            id,
                            paragraphIsOpen,
                        };
                    }
                } else if (element.includes('w:bookmarkEnd ')) {
                    const prBkIsOpen = (paragraphIsOpen && bookMarkIsOpen);
                    const id = regexBookmarkId.exec(element) !== null ? parseInt(regexBookmarkId.exec(element)[0], 10) : -1;
                    if (id > -1) {
                        let indexEnd = prBkIsOpen ? countParagraphs - 1 : countParagraphs;

                        if (indexEnd < bookmarks[id].start) {
                            indexEnd = bookmarks[id].start;
                        }

                        const countParagraphsInBK = (indexEnd - bookmarks[id].start) + 1;
                        bookmarks[id].end = indexEnd;
                        bookmarks[id].endInOtherPR = (prBkIsOpen && (bookmarks[id].start !== fix));
                        bookmarks[id].endIsMinePR = ((paragraphIsOpen && bookMarkIsOpen === false) || (bookmarks[id].start === fix));
                        bookmarks[id].countParagraphs = countParagraphsInBK;
                    }
                }
            }

            return bookmarks;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Достать диапазон параграфов
     * @param {{}[]} paragraphs
     * @param {number} start
     * @param {number} end
     */
    private getRangeParagraphs(paragraphs: convert.Element[], start: number, end: number): any[] {
        return paragraphs.slice(start + 1, end + 1);
    }

    /**
     * Вставить параграфы в paragraphs от start до end из newParagraphs
     * @param {{}[]} paragraphs
     * @param {{}[]} newParagraphs
     * @param {number} start
     * @param {number} end
     * @returns {{}[]} Возвращает новый объединенный параграф
     */
    private addNewParagraphs(paragraphs: convert.Element[], newParagraphs: convert.Element[], start: number, end: number): any[] {
        try {
            if (newParagraphs.length < 0) {
                return paragraphs;
            }
            let NewParagraph = paragraphs.slice(0, start + 1);
            NewParagraph = NewParagraph.concat(newParagraphs);
            NewParagraph = NewParagraph.concat(
                paragraphs.slice(end + 1, paragraphs.length),
            );
            return NewParagraph;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    // /**
    //  * Заменить тег w:r в paragraph на тот что в otherParagraph
    //  * @param {{}} paragraph
    //  * @param {{}} otherParagraph
    //  * @returns {{}} Возвращает paragraph
    //  */
    // private replaceTextFromParagraph(paragraph: any[], otherParagraph: any[]): any[] {
    //     if (
    //         !paragraph ||
    //         !otherParagraph ||
    //         !otherParagraph['w:r'] ||
    //         !paragraph['w:r']
    //     ) {
    //         return paragraph;
    //     }
    //     paragraph['w:r'] = otherParagraph['w:r'];
    //     return paragraph;
    // }

    /**
     * Заменить тэги в paragraph на те что в otheParagraph кроме bookmarkStart,bookmarkEnd
     * @param {{}} paragraph
     * @param {{}} otheParagraph
     * @param check
     * @returns {{}} Возвращает paragraph
     */
    replaceTextFromOtherParagraph(paragraph: convert.Element, otherParagraph: convert.Element, check: boolean): convert.Element {
        try {
            const buffer = [];
            const parLength = paragraph.elements.length;
            const otherParLength = otherParagraph.elements.length;

            for (let i = 0; i < parLength; i++) {
                const elementName = paragraph.elements[i].name;
                if (!(elementName === 'w:bookmarkEnd' || elementName === 'w:bookmarkStart' || elementName === 'w:pPr')) {
                    break;
                } else {
                    if (elementName === 'w:pPr') {
                        const ind = otherParagraph.elements.findIndex(j => j.name === 'w:pPr');
                        if (ind > -1) {
                            buffer.push(otherParagraph.elements[ind]);
                        } else {
                            buffer.push(paragraph.elements[i]);
                        }
                    } else {
                        buffer.push(paragraph.elements[i]);
                    }
                }
            }

            for (let i = 0; i < otherParLength; i++) {
                const elementName = otherParagraph.elements[i].name;
                if (!(elementName === 'w:bookmarkEnd' || elementName === 'w:bookmarkStart' || elementName === 'w:pPr')) {
                    buffer.push(otherParagraph.elements[i]);
                }
            }

            for (let i = parLength - 1; i > 0; i--) {
                const name = paragraph.elements[i].name;

                if (name === 'w:bookmarkEnd') {

                    let id: string | number = -1;
                    let ind = -1;

                    try {
                        id = paragraph.elements[i].attributes['w:id'];
                    } catch (error) {
                        console.error(`[ReplaceTextFromOtherParagraph | id] ${error}`);
                        id = -1;
                    }

                    try {
                        ind = buffer.findIndex(
                            j => (j.attributes['w:id'] === null || j.attributes['w:id'] === undefined ? '' : j.attributes['w:id']) === id,
                        );
                    } catch (error) {
                        ind = -2;
                    }

                    if (ind === -1 || check) {
                        buffer.push(paragraph.elements[i]);
                    }
                } else {
                    break;
                }
            }

            paragraph.elements = buffer;

            return paragraph;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Удалить все тэги кроме bookmarkEnd,bookmarkStart,pPr в параграфе
     * @param {{}} paragraph
     * @returns {{}} Возвращает paragraph
     */
    deleteTextInParagraph(paragraph: convert.Element): convert.Element {
        const buffer = [];
        for (const element of paragraph.elements) {
            const name = element.name;
            if (name === 'w:bookmarkEnd' || name === 'w:bookmarkStart' || name === 'w:pPr') {
                buffer.push(element);
            }
        }
        paragraph.elements = buffer;
        return paragraph;
    }

    deleteBookMarksInLastPR_FIX(paragraph: convert.Element): convert.Element {
        try {
            for (const [i, element] of paragraph.elements.entries()) {
                const name = element.name;
                if (name === 'w:bookmarkEnd') {
                    paragraph.elements[i] = null;
                    paragraph.elements.splice(i, 1);
                }
            }
            return paragraph;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
