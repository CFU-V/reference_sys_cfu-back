import { IMergedDocumentData } from '../interfaces/merged.document.data.interface';
import { IDocumentBookmark } from '../interfaces/document.bookmark.interface';
import * as convert from 'xml-js';
import { IMergedDocument } from '../interfaces/merged.document.interface';
import { hasOwnProperty } from 'tslint/lib/utils';
import { MergeDocumentDto } from '../dto/merge.document.dto';
import * as dotenv from 'dotenv';
dotenv.config();

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
        if (this.hyperlinks.elements[0].elements.length <= 0 || this.hyperlinks == null) {
            console.error('[CheckValidateParams] Ошибка! hyperlinks <= 0 || null');
            return true;
        }
        return false;
    }

    /**
     * объединение всех файлов (дочерних) в главный документ
     * @param docFiles
     * @param {string[]} xmlLinks Массив ссылок XML файллов (дочерних)
     * @returns {void}
     */
    public start(docFiles: MergeDocumentDto[], xmlLinks: string[]): IMergedDocument {
        try {
            this.checkValidateParams();
            for (const [index, doc] of docFiles.entries()) {
                const response: IMergedDocumentData = this.getOperation(this.paragraphs, this.bookmarks, doc, xmlLinks[index]);
                this.bookmarks = response.bookmarks;
                this.paragraphs = response.paragraphs;
            }
            this.documentObject.elements[0].elements[0].elements = this.fixSpaceInTextParagraph(this.paragraphs);
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
            this.hyperlinks = convert.xml2js(links, {compact: false, trim: false});
            this.documentObject = convert.xml2js(xml, {compact: false, trim: false});
            this.document = xml;
            this.paragraphs = this.documentObject.elements[0].elements[0].elements;
            const response = this.getBookmarks(this.paragraphs);
            this.bookmarks = response.bookmarks;
            this.paragraphs = response.paragraphs;

            this.checkValidateParams();
        } catch (error) {
            console.error(`[Load] Ошибка! ${error}`);
            throw error;
        }
    }

    /**
     * * Исправление поврежденных тэгов w:t после парсера
     * @param {[]} paragraphs
     * @returns {[]} paragraphs
     */
    fixSpaceInTextParagraph(paragraphs: convert.Element[]): convert.Element[] {
        for (const paragraph of paragraphs) {
            if (paragraph.name === 'w:p') {
                if (!this.ObjectHasKey(paragraph, 'elements')) {
                    continue;
                }
                const elementsLength = paragraph.elements.length;

                for (let j = 0; j < elementsLength; j++) {
                    if (paragraph.elements[j].name === 'w:r') {
                        if (!this.ObjectHasKey(paragraph.elements[j], 'elements')) {
                            continue;
                        }
                        const wrLength = paragraph.elements[j].elements.length;

                        for (let k = 0; k < wrLength; k++) {
                            if (paragraph.elements[j].elements[k].name === 'w:t') {
                                if (!this.ObjectHasKey(paragraph.elements[j].elements[k], 'elements')) {
                                    paragraph.elements[j].elements[k].elements = [];
                                    paragraph.elements[j].elements[k].elements.push({
                                        text: ' ',
                                        type: 'text',
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        return paragraphs;
    }

    /**
     * Удалить глобальные закладки (гл. Документ)
     * @returns {void}
     */
    private deleteGlobalBookmarks(bookmarks: IDocumentBookmark[], paragraphs: convert.Element[]): IMergedDocumentData {
        if (paragraphs.findIndex(i => i.name === 'w:bookmarkEnd') > -1) {
            for (const [i, bookmark] of bookmarks.entries()) {
                if (!bookmark.endInOtherPR && !bookmark.endIsMinePR ) {
                    for (let j = bookmark.end; j > 0; j--) {
                        if (paragraphs[j].name === 'w:p') {
                            if (this.ObjectHasKey(paragraphs[j], 'elements')) {
                                paragraphs[j].elements.push(paragraphs[bookmark.end]);
                                paragraphs[bookmark.end] = null;
                                paragraphs.splice(bookmark.end, 1);
                                bookmark.endIsMinePR = true;
                                bookmark.end = j;

                                for (let k = i + 1; k < bookmarks.length; k++) {
                                    bookmarks[k].end -= 1;
                                    bookmarks[k].start -= 1;
                                }
                                break;
                            }
                        }
                    }
                }
            }
            return { paragraphs, bookmarks };
        } else {
            return { paragraphs, bookmarks };
        }
    }

    /**
     *
     * @param {*} object
     */
    isNullOrUndefined(object) {
        return object === null || object === undefined;
    }

    /**
     * Удалить сломанные закладки
     * @param {[]} bookmarks
     * @returns {[]} bookmarks
     */
    removeBrokenBookMarks(bookmarks: IDocumentBookmark[]) {
        const newBookmarks = [];
        for (const bookmark of bookmarks) {
            if (!(isNaN(bookmark.end) || this.isNullOrUndefined(bookmark.end))) {
                newBookmarks.push(bookmark);
            }
        }
        return newBookmarks;
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
                if (!this.ObjectHasKey(paragraphs[i].elements, 'length')) {
                    continue;
                }
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
     * @param doc
     * @param linksXml
     * @returns {{bookmarks: {}[], paragraphs: {}[]}}
     */
    private getOperation(
        mainParagraphs: convert.Element[],
        mainBookmarks: IDocumentBookmark[],
        doc: MergeDocumentDto,
        linksXml: string,
    ): IMergedDocumentData {
        // ? #1 Избежать системных закладок и работать с закладками которые есть в обоих файлах
        // ? #2 Если количество параграфов совпадает
        // ? #3 Если в чайлд больше параграфов чем в мейн
        // ? #4 Если в чайлд меньше параграфов чем в мейн
        // !Исправить, после замены параграфов,текстов - заменить ID's на мейн
        try {
            this.checkValidateParams();
            const objectXml = convert.xml2js(doc.xml, {compact: false, trim: false}); // Конвертируем XML в Array of Object;
            const objectLinksXml = convert.xml2js(linksXml, {compact: false, trim: false}); // Конвертируем XML в Array of Object;

            // Удаляем глобальные закладки
            const documentData: IMergedDocumentData = this.getBookmarks(objectXml.elements[0].elements[0].elements);
            const bookmarksXml = documentData.bookmarks;
            let paragraphsXml = documentData.paragraphs;
            for (const bookmarkXml of bookmarksXml) {
                if (!bookmarkXml.name) {
                    continue; // Это системные закладки
                }

                bookmarkXml.name = bookmarkXml.name.toString().replace(/(Добавить|Удалить|Заменить)_/, '')

                const mainBookmarkIndex = mainBookmarks.findIndex(i => i.name === bookmarkXml.name);

                if (mainBookmarkIndex === -1) {
                    continue;
                }
                const mainBookmark = mainBookmarks[mainBookmarkIndex];
                paragraphsXml = this.computingLinks(bookmarkXml.start, bookmarkXml.end, paragraphsXml, objectLinksXml);
                let IsText = '';

                for (let i = bookmarkXml.start; i <= bookmarkXml.end; i++) {
                    for (const el1 of paragraphsXml[i].elements) {
                        if (el1.name === 'w:r') {
                            if (el1.elements) {
                                for (const el2 of el1.elements) {
                                    if (el2.name === 'w:t') {
                                        if (el2.elements) {
                                            for (const el3 of el2.elements) {
                                                if (el3.type === 'text') {
                                                    IsText += el3.text;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

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
                    mainParagraphs = this.addLinkOfChild(mainParagraphs, mainBookmarks[mainBookmarkIndex].end, doc, IsText.length < 4 ? 'Удалено от' : 'Изменение от');
                } else {
                    console.log(2)
                    if (bookmarkXml.countParagraphs > mainBookmark.countParagraphs) {
                        console.log(2.1)
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
                            console.log('2.1.1')
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
                            //

                        } else {
                            console.log('2.1.2')
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
                            this.deleteBookMarksInLastPR_FIX(mainParagraphs[mainBookmarks[mainBookmarkIndex].end]);
                            // Фикс закладок
                            if (mainBookmarks[mainBookmarkIndex].endInOtherPR) {
                                console.log('2.1.2.1')
                                const index = mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                                    .findIndex(i => i.name === 'w:bookmarkEnd');
                                if (index > -1) {
                                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements[index] = null;
                                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements.splice(index, 1);
                                }
                            } else {
                                console.log('2.1.2.2')
                                mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                                    .push(
                                        {
                                            attributes: {'w:id': mainBookmarks[mainBookmarkIndex].id},
                                            name: 'w:bookmarkEnd', type: 'element',
                                        });
                            }
                        }
                        // console.log(mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements);
                    } else {
                        console.log(2.2)
                        mainParagraphs[mainBookmark.start] = this.replaceTextFromOtherParagraph(
                            mainParagraphs[mainBookmark.start],
                            paragraphsXml[mainBookmark.start],
                            false,
                        );

                        if (
                            mainBookmark.endInOtherPR === bookmarkXml.endInOtherPR &&
                            mainBookmark.endIsMinePR === bookmarkXml.endIsMinePR
                        ) {
                            console.log('2.2.1')
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
                            console.log('2.2.2')
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
                    mainParagraphs = this.addLinkOfChild(mainParagraphs, mainBookmarks[mainBookmarkIndex].end, doc, IsText.length < 4 ? 'Удалено от' : 'Изменение от');
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

    private addLinkOfChild(mainParagraphs, index: number, doc: MergeDocumentDto, text: string) {
        const arrayOfElements = [];
        let startIndex = -1;
        for ( let i = mainParagraphs[index].elements.length - 1; i > 0; i--) {
            if ( mainParagraphs[index].elements[i].name !== 'w:bookmarkEnd') {
                startIndex = i + 1;
                break;
            }
        }
        if (startIndex > mainParagraphs[index].elements.length) {
            startIndex = mainParagraphs[index].elements.length;
        }
        arrayOfElements
            .push(
                {
                    attributes: { 'w:rsidRPr': '00142DBF' },
                    name: 'w:r',
                    type: 'element',
                    elements: [
                        {
                            type: 'element',
                            name: 'w:rPr',
                            elements: [
                                {
                                    type: 'element',
                                    name: 'w:color',
                                    attributes: { 'w:val': '808080' },
                                },
                            ],
                        },
                        {
                            type: 'element',
                            name: 'w:t',
                            attributes: { 'xml:space': 'preserve' },
                            elements: [
                                {
                                    type: 'text',
                                    text: `(${text}: `,
                                },
                            ],
                        },
                    ],
                });
        arrayOfElements
            .push(
                {
                    attributes: { 'w:rsidRPr': '00142DBF' },
                    name: 'w:r',
                    type: 'element',
                    elements: [
                        {
                            type: 'element',
                            name: 'w:fldChar',
                            attributes: { 'w:fldCharType': 'begin' },
                        },
                    ],
                });
        arrayOfElements
            .push(
                {
                    attributes: { 'w:rsidRPr': '00142DBF' },
                    name: 'w:r',
                    type: 'element',
                    elements: [
                        {
                            type: 'element',
                            name: 'w:t',
                            elements: [
                                {
                                    type: 'text',
                                    text: `HYPERLINK "${process.env.APP_URL}/docview/${doc.id}"`,
                                },
                            ],
                        },
                    ],
                });
        arrayOfElements
            .push(
                {
                    attributes: { 'w:rsidRPr': '00142DBF' },
                    name: 'w:r',
                    type: 'element',
                    elements: [
                        {
                            type: 'element',
                            name: 'w:fldChar',
                            attributes: { 'w:fldCharType': 'separate' },
                        },
                    ],
                });
        arrayOfElements
            .push(
                {
                    attributes: { 'w:rsidRPr': '00142DBF' },
                    name: 'w:r',
                    type: 'element',
                    elements: [
                        {
                            type: 'element',
                            name: 'w:rPr',
                            elements: [
                                {
                                    type: 'element',
                                    name: 'w:color',
                                    attributes: { 'w:val': '0000FF' },
                                },
                            ],
                        },
                        {
                            type: 'element',
                            name: 'w:t',
                            attributes: { 'xml:space': 'preserve' },
                            elements: [
                                {
                                    type: 'text',
                                    text: `${doc.date.getDate()}-${doc.date.getMonth() + 1}-${doc.date.getFullYear()}`,
                                },
                            ],
                        },
                    ],
                });
        arrayOfElements
            .push(
                {
                    attributes: { 'w:rsidRPr': '00142DBF' },
                    name: 'w:r',
                    type: 'element',
                    elements: [
                        {
                            type: 'element',
                            name: 'w:fldChar',
                            attributes: { 'w:fldCharType': 'end' },
                        },
                    ],
                });

        arrayOfElements
            .push(
                {
                    attributes: { 'w:rsidRPr': '00142DBF' },
                    name: 'w:r',
                    type: 'element',
                    elements: [
                        {
                            type: 'element',
                            name: 'w:rPr',
                            elements: [],
                        },
                        {
                            type: 'element',
                            name: 'w:t',
                            elements: [
                                {
                                    type: 'text',
                                    text: ' )',
                                },
                            ],
                        },
                    ],
                });
        for (const el of arrayOfElements) {
            mainParagraphs[index].elements.splice(startIndex, 0, el);
            startIndex++;
        }
        return mainParagraphs;
    }

    /**
     * Получить массив закладок из гл. Документа
     * @returns {[]} Возвращает массив закладок из документа
     * @param paragraphs
     */
    private getBookmarks(paragraphs: convert.Element[]): IMergedDocumentData {
        try {
            let bookmarks: IDocumentBookmark[] = [];
            let bookMarkIsOpen = false;
            for (const [i, paragraph] of paragraphs.entries()) {
                if (paragraph.name === 'w:p') {
                    bookMarkIsOpen = false;
                    if(!this.ObjectHasKey(paragraph, 'elements')) {
                        continue;
                    }
                    for (const element of paragraph.elements) {
                        if (element.name === 'w:bookmarkStart') {
                            let elName = element.attributes['w:name'];
                            if (elName === '_GoBack') {
                                elName = null;
                            }
                            bookMarkIsOpen = true;
                            const elId = element.attributes['w:id'];
                            bookmarks.push({
                                start: i,
                                name: elName,
                                id: parseInt(elId.toString(), 10),
                            });

                        } else if (element.name === 'w:bookmarkEnd') {
                            const elId = element.attributes['w:id'];
                            const index = bookmarks.findIndex(item => item.id == elId);
                            if (index > -1) {
                                bookmarks[index].end = i;
                                bookmarks[index].endInOtherPR = (bookMarkIsOpen && (bookmarks[index].end != bookmarks[index].start));
                                bookmarks[index].endIsMinePR = (bookmarks[index].end == bookmarks[index].start) || (bookMarkIsOpen == false);
                            }
                        }
                    }
                }
                if (paragraph.name === 'w:bookmarkStart') {
                    const elName = paragraph.attributes['w:name'];
                    throw new Error(`[GetBookmarks] Закладка вне параграфов. Name: ${elName}.`);
                } else if (paragraph.name === 'w:bookmarkEnd') {
                    const id = paragraph.attributes['w:id'];
                    const index = bookmarks.findIndex(item => item.id == id);
                    if (index > -1) {
                        bookmarks[index].end = i;
                        bookmarks[index].endInOtherPR = false;
                        bookmarks[index].endIsMinePR = false;
                    }
                }
            }
            bookmarks = this.removeBrokenBookMarks(bookmarks);

            const response = this.deleteGlobalBookmarks(bookmarks, paragraphs);
            bookmarks = response.bookmarks;
            paragraphs = response.paragraphs;
            for (const bookmark of bookmarks) {
                if (bookmark.endInOtherPR) {
                    bookmark.end -= 1;
                }
            }

            for (const bookmark of bookmarks) {
                const tempNum = (bookmark.end - bookmark.start) + 1;
                bookmark.countParagraphs = (tempNum <= 0 ? 1 : tempNum);
            }

            return {
                paragraphs,
                bookmarks,
            };
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
                console.error('[AddNewParagraphs] Ошибка! Массив newParagraphs пуст');
                return paragraphs;
            }

            let NewParagraph = paragraphs.slice(0, start + 1);
            NewParagraph = NewParagraph.concat(newParagraphs);
            NewParagraph = NewParagraph.concat(paragraphs.slice(end + 1, paragraphs.length));
            return NewParagraph;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }


    /**
     * Заменить тэги в paragraph на те что в otheParagraph кроме bookmarkStart,bookmarkEnd
     * @param {{}} paragraph
     * @param otherParagraph
     * @param check
     * @returns {{}} Возвращает paragraph
     */
    replaceTextFromOtherParagraph(paragraph: convert.Element, otherParagraph: convert.Element, check: boolean): convert.Element {
        try {
            if (!this.ObjectHasKey(paragraph.elements, 'length')) {
                return paragraph;
            }

            if (!otherParagraph ||
                !this.ObjectHasKey(otherParagraph, 'elements') ||
                !this.ObjectHasKey(otherParagraph.elements, 'length')
            ) {
                return paragraph;
            }

            const buffer = [];
            const parLength = paragraph.elements.length;
            const otherParLength = otherParagraph.elements.length;

            for (let i = 0; i < parLength; i++) {
                const elementName = paragraph.elements[i].name;
                if (!(elementName === 'w:bookmarkEnd' || elementName === 'w:bookmarkStart' || elementName === 'w:pPr')) {
                    break;
                } else {
                    if (elementName === 'w:pPr') {
                        const ind = otherParagraph.elements.findIndex(el => el.name === 'w:pPr');
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
                            j => (j.attributes['w:id'] === null || j.attributes['w:id'] === undefined ? '' : j.attributes['w:id']) == id,
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
        const elements = [];
        for (const element of paragraph.elements) {
            if (element.name === 'w:bookmarkEnd' || element.name === 'w:bookmarkStart' || element.name === 'w:pPr') {
                elements.push(element);
            }
        }
        paragraph.elements = elements;
        return paragraph;
    }

    deleteBookMarksInLastPR_FIX(paragraph: convert.Element): convert.Element {
        try {
            const elements = [];
            for (const element of paragraph.elements) {
                if (element.name !== 'w:bookmarkEnd') {
                    elements.push(element);
                }
            }
            paragraph.elements = elements;

            return paragraph;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Есть ли свойство [key] в объекте [Object]
     * @param {{}} object
     * @param {string} key
     * @returns {boolean}
     */
    ObjectHasKey(object, key): boolean {
        return object ? Object.prototype.hasOwnProperty.call(object, key) : false;
    }
}
