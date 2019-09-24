import * as xl from 'xml2js';
import { IMergedDocumentData } from '../interfaces/merged.document.data.interface';
import { IDocumentBookmark } from '../interfaces/document.bookmark.interface';

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
    private paragraphs: any[];

    constructor() {
        this.document = null;
        this.documentObject = null;
        this.bookmarks = [];
        this.paragraphs = [];
    }

    /**
     *
     */
    private checkValidateParams(): boolean {
        if (this.document === null || this.document === '') {
            throw Error('[checkValidateParams] Error: document == null || ""');
        }
        if (this.documentObject === null || this.documentObject === '') {
            throw Error('[checkValidateParams] Error: documentObject == null || ""');
        }
        if (this.bookmarks.length <= 0 || this.bookmarks === null) {
            throw Error('[checkValidateParams] Error: bookmarks <= 0 || null');
        }
        if (this.paragraphs.length <= 0 || this.paragraphs === null) {
            throw Error('[checkValidateParams] Error: bookmarks <= 0 || null');
        }
        return false;
    }

    /**
     * объединение всех файлов (дочерних) в главный документ
     * @param {string[]} xmlFiles Массив XML файллов (дочерних)
     * @returns {void}
     */
    public async start(xmlFiles: string[]): Promise<string> {
        try {
            this.checkValidateParams();
            for (const xml of xmlFiles) {
                const response: IMergedDocumentData = await this.getOperation(this.paragraphs, this.bookmarks, xml);
                this.bookmarks = response.bookmarks;
                this.paragraphs = response.paragraphs;
            }
            this.documentObject['w:document']['w:body'][0]['w:p'] = this.paragraphs;
            const builder = new xl.Builder();
            return builder.buildObject(this.documentObject);
        } catch (error) {
            throw Error(`[start] Ошибка при работе с файлом. ${error}`);
        }
    }

    /**
     * Загрузить главный документ
     * @param {string} xml XML документа
     * @returns {void}
     */
    public async load(xml: string): Promise<void> {
        try {
            let parseXmlFile = null;
            await xl.parseString(
                xml,
                { trim: false },
                (err, result) => {
                    parseXmlFile = result;
                },
            );
            this.document = xml;
            this.documentObject = parseXmlFile;
            this.bookmarks = this.getBookmarks(xml);
            this.paragraphs = this.documentObject['w:document']['w:body'][0]['w:p'];
            this.checkValidateParams();
            // Фикс закладок, удаляем глобальные закладки
            await this.deleteGlobalBookmarks();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Удалить глобальные закладки (гл. Документ)
     * @returns {void}
     */
    private async deleteGlobalBookmarks(): Promise<void> {
        if (!this.documentObject['w:document']['w:body'][0]['w:bookmarkEnd']) {
            return;
        }
        const bookmarksEnd = this.documentObject['w:document']['w:body'][0]['w:bookmarkEnd'];
        for (const [index, bookmarkEnd] of bookmarksEnd.entries()) {
            if (!bookmarkEnd.$) {
                continue;
            }
            const bookmarkEndId = bookmarkEnd.$['w:id'];
            const bookmarkEndIndex = this.bookmarks.findIndex(i => {
                return i && i.id === bookmarkEndId;
            });
            if (bookmarkEndIndex > -1) {
                delete this.documentObject['w:document']['w:body'][0]['w:bookmarkEnd'][index];
                if (!this.paragraphs[this.bookmarks[bookmarkEndIndex].end]['w:bookmarkEnd']) {
                    this.paragraphs[this.bookmarks[bookmarkEndIndex].end]['w:bookmarkEnd'] = [];
                }
                this.paragraphs[this.bookmarks[bookmarkEndIndex].end]['w:bookmarkEnd']
                    .push({ $: { 'w:id': this.bookmarks[bookmarkEndIndex].id } });
            }
        }
    }

    /**
     * Основная функция
     * @param {{}[]} mainParagraphs
     * @param {{}[]} mainBookmarks
     * @param {string} xml
     * @returns {{bookmarks: {}[], paragraphs: {}[]}}
     */
    private async getOperation(mainParagraphs: any[], mainBookmarks: IDocumentBookmark[], xml: string): Promise<IMergedDocumentData> {
        // ? #1 Избежать системных закладок и работать с закладками которые есть в обоих файлах
        // ? #2 Если количество параграфов совпадает
        // ? #3 Если в чайлд больше параграфов чем в мейн
        // ? #4 Если в чайлд меньше параграфов чем в мейн
        // !Исправить, после замены параграфов,текстов - заменить ID's на мейн
        try {
            this.checkValidateParams();
            let objectXml = null;

            await xl.parseString(
                xml,
                { trim: false },
                (err, result) => {
                    objectXml = result; // Конвертируем XML в Object
                },
            );

            const bookmarksXml: IDocumentBookmark[] = this.getBookmarks(xml); // Получаем все закладки из данного документа
            const paragraphsXml = objectXml['w:document']['w:body'][0]['w:p']; // Достаем параграф ввиде объекта

            for (const bookmarkXml of bookmarksXml) {
                if (!bookmarkXml.name) {
                    continue; // Это системные закладки
                }

                const mainBookmarkIndex = mainBookmarks.findIndex(i => i && i.name === bookmarkXml.name);
                const mainBookmark = mainBookmarks.find(element => element && element.name === bookmarkXml.name);

                if (!mainBookmark) {
                    continue;
                }

                if (bookmarkXml.countParagraphs === mainBookmark.countParagraphs) {
                    for (let j = 0; j < mainBookmark.countParagraphs; j++) {
                        if (!(mainParagraphs[mainBookmark.start + j] && paragraphsXml[bookmarkXml.start + j])) {
                            continue;
                        }
                        mainParagraphs[mainBookmark.start + j] = this.replaceTextFromParagraph(
                            mainParagraphs[mainBookmark.start + j],
                            paragraphsXml[bookmarkXml.start + j],
                        );
                    }
                } else {
                    if (bookmarkXml.countParagraphs > mainBookmark.countParagraphs) {
                        mainParagraphs[mainBookmark.start] = this.replaceTextFromParagraph(
                            mainParagraphs[mainBookmark.start],
                            paragraphsXml[bookmarkXml.start],
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
                            mainBookmark.end += paragraphsCount;
                            for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                                mainBookmarks[j].start += paragraphsCount;
                                mainBookmarks[j].end += paragraphsCount;
                            }
                            // Фикс закладок
                            if (paragraphsXml[bookmarkXml.end]['w:bookmarkEnd'] || bookmarkXml.endIsMinePR === true) {
                                mainParagraphs[mainBookmark.end]['w:bookmarkEnd'] = [];
                                mainParagraphs[mainBookmark.end]['w:bookmarkEnd'].push({ $: { 'w:id': mainBookmark.id } });
                                // console.log('A: 1. ID: ' + mainBookmarkIndex);
                            } else {
                                mainParagraphs[mainBookmark.end]['w:bookmarkEnd'] = [];
                                mainParagraphs[mainBookmark.end]['w:bookmarkEnd'].push({ $: { 'w:id': mainBookmark.id } });
                                // console.log('A: 2. ID: ' + mainBookmarkIndex);
                            }
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
                            for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                                mainBookmarks[j].start += paragraphsCount;
                                mainBookmarks[j].end += paragraphsCount;
                            }
                            // Фикс закладок
                            if (mainBookmark.endInOtherPR) {
                                if (mainParagraphs[mainBookmark.end]['w:bookmarkEnd']) {
                                    delete mainParagraphs[mainBookmark.end]['w:bookmarkEnd'];
                                }
                                // console.log('A: 3. ID: ' + mainBookmarkIndex);
                            } else {
                                // console.log('A: 5. ID: ' + mainBookmarkIndex);
                                if (paragraphsXml[bookmarkXml.end]['w:bookmarkEnd'] || bookmarkXml.endIsMinePR === true) {
                                    mainParagraphs[mainBookmark.end]['w:bookmarkEnd'] = [];
                                    mainParagraphs[mainBookmark.end]['w:bookmarkEnd'].push({ $: { 'w:id': mainBookmark.id } });
                                } else {
                                    mainParagraphs[mainBookmark.end]['w:bookmarkEnd'] = [];
                                    mainParagraphs[mainBookmark.end]['w:bookmarkEnd'].push({ $: { 'w:id': mainBookmark.id } });
                                }
                            }
                        }
                    } else {
                        mainParagraphs[mainBookmark.start] = this.replaceTextFromParagraph(
                            mainParagraphs[mainBookmark.start],
                            paragraphsXml[bookmarkXml.start],
                        );

                        const paragraphsCount = bookmarkXml.countParagraphs - mainBookmark.countParagraphs;
                        // ? Если местонахождение закладок с обоих файлах совпадает
                        if (
                            mainBookmark.endInOtherPR === bookmarkXml.endInOtherPR &&
                            mainBookmark.endIsMinePR === bookmarkXml.endIsMinePR
                        ) {
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
                            for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                                mainBookmarks[j].start += paragraphsCount;
                                mainBookmarks[j].end += paragraphsCount;
                            }
                            // Фикс закладок
                            if (paragraphsXml[bookmarkXml.end]['w:bookmarkEnd'] || bookmarkXml.endIsMinePR === true) {
                                if (!mainParagraphs[mainBookmark.end]['w:bookmarkEnd']) {
                                    mainParagraphs[mainBookmark.end]['w:bookmarkEnd'] = [];
                                }
                                mainParagraphs[mainBookmark.end]['w:bookmarkEnd'].push({ $: { 'w:id': mainBookmark.id } });
                                // console.log('D: 1. ID: ' + mainBookmarkIndex);
                            } else {
                                if (!mainParagraphs[mainBookmark.end]['w:bookmarkEnd']) {
                                    mainParagraphs[mainBookmark.end]['w:bookmarkEnd'] = [];
                                }

                                mainParagraphs[mainBookmark.end]['w:bookmarkEnd'].push({ $: { 'w:id': mainBookmark.id } });
                                // console.log('D: 2. ID: ' + mainBookmarkIndex);
                            }
                        } else {
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
                            for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                                mainBookmarks[j].start += paragraphsCount;
                                mainBookmarks[j].end += paragraphsCount;
                            }
                            // Фикс закладок
                            if (mainBookmark.endInOtherPR === true) {
                                if (mainParagraphs[mainBookmark.end]['w:bookmarkEnd']) {
                                    delete mainParagraphs[mainBookmark.end]['w:bookmarkEnd'];
                                }
                                // console.log('D: 3. ID: ' + mainBookmarkIndex);
                            } else {
                                // console.log('D: 5. ID: ' + mainBookmarkIndex);
                                if (paragraphsXml[bookmarkXml.end]['w:bookmarkEnd'] || bookmarkXml.endIsMinePR === true) {
                                    if (!mainParagraphs[mainBookmark.end]['w:bookmarkEnd']) {
                                        mainParagraphs[mainBookmark.end]['w:bookmarkEnd'] = [];
                                    }
                                    mainParagraphs[mainBookmark.end]['w:bookmarkEnd'].push({ $: { 'w:id': mainBookmark.id } });
                                } else {
                                    if (!mainParagraphs[mainBookmark.end]['w:bookmarkEnd']) {
                                        mainParagraphs[mainBookmark.end]['w:bookmarkEnd'] = [];
                                    }
                                    mainParagraphs[mainBookmark.end]['w:bookmarkEnd'].push({ $: { 'w:id': mainBookmark.id } });
                                }
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
        const regexBookmarkName = /п_[а-я,0-9,-,_]+/i;
        const regexBookmarkId = /[0-9]+/i;
        const splitDocument = xml.split('<');
        const bookmarks: IDocumentBookmark[] = [];
        let paragraphIsOpen = false;
        let bookMarkIsOpen = false;
        let countParagraphs = -1;
        for (const element of splitDocument) {
            if (element.includes('w:p ')) {
                countParagraphs++;
                paragraphIsOpen = true;
                bookMarkIsOpen = false;
            } else if (element.includes('/w:p>')) {
                paragraphIsOpen = false;
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
                    bookmarks[id].endInOtherPR = prBkIsOpen;
                    bookmarks[id].endIsMinePR = (paragraphIsOpen && bookMarkIsOpen === false);
                    bookmarks[id].countParagraphs = countParagraphsInBK;
                }
            }
        }

        return bookmarks;
    }

    /**
     * Достать диапазон параграфов
     * @param {{}[]} paragraphs
     * @param {number} start
     * @param {number} end
     */
    private getRangeParagraphs(paragraphs: any[], start: number, end: number): any[] {
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
    private addNewParagraphs(paragraphs: any[], newParagraphs: any[], start: number, end: number): any[] {
        if (newParagraphs.length < 0) {
            return paragraphs;
        }
        let NewParagraph = paragraphs.slice(0, start + 1);
        NewParagraph = NewParagraph.concat(newParagraphs);
        NewParagraph = NewParagraph.concat(
            paragraphs.slice(end + 1, paragraphs.length),
        );
        return NewParagraph;
    }

    /**
     * Заменить тег w:r в paragraph на тот что в otherParagraph
     * @param {{}} paragraph
     * @param {{}} otherParagraph
     * @returns {{}} Возвращает paragraph
     */
    private replaceTextFromParagraph(paragraph: any[], otherParagraph: any[]): any[] {
        if (
            !paragraph ||
            !otherParagraph ||
            !otherParagraph['w:r'] ||
            !paragraph['w:r']
        ) {
            return paragraph;
        }
        paragraph['w:r'] = otherParagraph['w:r'];
        return paragraph;
    }
}
