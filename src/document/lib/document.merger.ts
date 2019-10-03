import * as xl from 'xml2js';
import { IMergedDocumentData } from '../interfaces/merged.document.data.interface';
import { IDocumentBookmark } from '../interfaces/document.bookmark.interface';
import * as convert from 'xml-js';
import { IMergedDocument } from "../interfaces/merged.document.interface";

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
        if (this.document == null || this.document == '') {
            console.error('[CheckValidateParams] Ошибка! document == null || ""');
            return true;
        }
        if (this.documentObject == null || this.documentObject == '') {
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
        if (this.hyperlinks.length <= 0 || this.hyperlinks == null) {
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
    public async start(xmlFiles: string[], xmlLinks: string[]): Promise<IMergedDocument> {
        try {
            this.checkValidateParams();
            for (const [index, xml] of xmlFiles.entries()) {
                try {
                    const response: IMergedDocumentData = await this.getOperation(this.paragraphs, this.bookmarks, xml, xmlLinks[index]);
                    this.bookmarks = response.bookmarks;
                    this.paragraphs = response.paragraphs;
                } catch (error) {
                    console.error(`[Start] Ошибка при работе с файлом. ${error}`);
                }
            }
            this.documentObject['elements'][0]['elements'][0]['elements'] = this.paragraphs;
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
    public async load(xml: string, links: string): Promise<void> {
        try {
            let parseXmlFile = convert.xml2js(xml, {compact: false, trim: false});
            this.hyperlinks = convert.xml2js(links, {compact: false, trim: false});
            this.document = xml;
            this.documentObject = parseXmlFile;
            this.bookmarks = await this.getBookmarks(xml);
            this.paragraphs = this.documentObject['elements'][0]['elements'][0]['elements'];
            this.checkValidateParams();
            const res: IMergedDocumentData = await this.deleteGlobalBookmarks(this.bookmarks, this.paragraphs);
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
    private async deleteGlobalBookmarks(bookmarks: IDocumentBookmark[], paragraphs: convert.Element | convert.ElementCompact): Promise<IMergedDocumentData> {
        try {
            if (paragraphs.findIndex(i => i.name === 'w:bookmarkEnd') !== -1) {
                for (const bookmark of bookmarks) {
                    if (bookmark.endInOtherPR || bookmark.endIsMinePR) continue;
                    let index = null;
                    try {
                        index = await paragraphs.findIndex(i => (i === null || i === undefined ? '' : i['attributes']['w:id']) === bookmark.id);
                    } catch (error) {
                        index = null;
                        console.error(`[DeleteGlobalBookmarks] ${error}`);
                    }

                    if (index) {
                        await paragraphs[bookmark.end]['elements'].push(paragraphs[index]);
                        paragraphs[index] = null;
                        await paragraphs.splice(index, 1);
                        bookmark.endIsMinePR = true;
                    }
                }
                return { paragraphs, bookmarks}
            } else {
                return {paragraphs, bookmarks}
            }
        }catch (error) {
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
    async computingLinks(
        start: number,
        end: number,
        paragraphs: convert.Element | convert.ElementCompact,
        links: convert.Element | convert.ElementCompact
    ): Promise<convert.Element | convert.ElementCompact> {
        try {
            this.checkValidateParams();
            for(let i = start; i <= end; i++) {
                const _max_el = paragraphs[i]['elements'].length;
                if(_max_el < 1) continue;
                for(let j = 0; j < _max_el; j++) {
                    const _name_el = paragraphs[i]['elements'][j]['name'];
                    if(_name_el != 'w:hyperlink') continue;
                    if (
                        paragraphs[i]['elements'][j]['attributes'] === null ||
                        paragraphs[i]['elements'][j]['attributes'] === undefined
                    ) {
                        continue;
                    }
                    if (
                        paragraphs[i]['elements'][j]['attributes']['r:id'] === null ||
                        paragraphs[i]['elements'][j]['attributes'] === undefined
                    ) {
                        continue;
                    }
                    const _dt_now_stamp = new Date();
                    const _id = paragraphs[i]['elements'][j]['attributes']['r:id'];
                    paragraphs[i]['elements'][j]['attributes']['r:id'] = 'rId' + _dt_now_stamp.getTime().toString();
                    const _index = links['elements'][0]['elements'].findIndex(i => i.attributes.Id == _id);
                    links['elements'][0]['elements'][_index]['attributes']['Id'] = 'rId' + _dt_now_stamp.getTime().toString();
                    this.hyperlinks['elements'][0]['elements'].push(links['elements'][0]['elements'][_index]);
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
     * @returns {{bookmarks: {}[], paragraphs: {}[]}}
     */
    private async getOperation(mainParagraphs: any[], mainBookmarks: IDocumentBookmark[], xml: string, linksXml: string): Promise<IMergedDocumentData> {
        // ? #1 Избежать системных закладок и работать с закладками которые есть в обоих файлах
        // ? #2 Если количество параграфов совпадает
        // ? #3 Если в чайлд больше параграфов чем в мейн
        // ? #4 Если в чайлд меньше параграфов чем в мейн
        // !Исправить, после замены параграфов,текстов - заменить ID's на мейн
        try {
            this.checkValidateParams();
            let objectXml = await convert.xml2js(xml, {compact: false, trim: false}); // Конвертируем XML в Array of Object;
            let objectLinksXml = await convert.xml2js(linksXml, {compact: false, trim: false}); // Конвертируем XML в Array of Object;

            // Удаляем глобальные закладки
            const documentData: IMergedDocumentData = await this.deleteGlobalBookmarks(this.getBookmarks(xml), objectXml['elements'][0]['elements'][0]['elements']);
            const bookmarksXml = documentData.bookmarks;
            let paragraphsXml = documentData.paragraphs;

            for (const bookmarkXml of bookmarksXml) {
                if (!bookmarkXml.name) {
                    continue; // Это системные закладки
                }

                const mainBookmarkIndex = mainBookmarks.findIndex(i => i && i.name === bookmarkXml.name);
                const mainBookmark = mainBookmarks.find(element => element && element.name === bookmarkXml.name);

                if (!mainBookmark) {
                    continue;
                }

                paragraphsXml = await this.computingLinks(bookmarkXml.start, bookmarkXml.end, paragraphsXml, objectLinksXml);

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
        let fix_ = -1;
        for (const element of splitDocument) {
            if (element.includes('w:p ')) {
                countParagraphs++;
                fix_ = countParagraphs;
                paragraphIsOpen = true;
                bookMarkIsOpen = false;
            } else if (element.includes('/w:p>')) {
                paragraphIsOpen = false;
                fix_ += 1;
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
                    bookmarks[id].endInOtherPR = (prBkIsOpen && (bookmarks[id].start != fix_));
                    bookmarks[id].endIsMinePR = ((paragraphIsOpen && bookMarkIsOpen == false) || (bookmarks[id].start == fix_));
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
    replaceTextFromOtherParagraph(paragraph: convert.Element, otheParagraph: convert.Element, check: boolean): convert.Element {
        let buffer = [];
        const parhLength = paragraph['elements'].length;
        const otherParLength = otheParagraph['elements'].length;

        for(let i = 0; i < parhLength; i++) {
            const elementName = paragraph['elements'][i]['name'];
            if (!(elementName === 'w:bookmarkEnd' || elementName === 'w:bookmarkStart' || elementName === 'w:pPr')) {
                break;
            } else {
                if (elementName === 'w:pPr') {
                    const _ind = otheParagraph['elements'].findIndex(i => i['name'] == 'w:pPr');
                    if (_ind > -1) {
                        buffer.push(otheParagraph['elements'][_ind]);
                    } else {
                        buffer.push(paragraph['elements'][i]);
                    }
                } else {
                    buffer.push(paragraph['elements'][i]);
                }
            }
        }

        for(let i = 0; i < otherParLength; i++) {
            const elementName = otheParagraph['elements'][i]['name'];
            if(!(elementName === 'w:bookmarkEnd' || elementName === 'w:bookmarkStart' || elementName === 'w:pPr')) {
                buffer.push(otheParagraph['elements'][i]);
            }
        }

        for(let i = parhLength-1; i > 0; i--) {
            const _name = paragraph['elements'][i]['name'];

            if(_name == 'w:bookmarkEnd') {

                let _id: string | number = -1;
                let _ind = -1;

                try {
                    _id = paragraph['elements'][i]['attributes']['w:id'];
                } catch (error) {
                    console.error(`[ReplaceTextFromOtherParagraph | id] ${error}`);
                    _id = -1;
                }

                try {
                    _ind = buffer.findIndex(i => (i['attributes']['w:id'] === null || i['attributes']['w:id'] === undefined ? '' : i['attributes']['w:id']) == _id);
                } catch (error) {
                    _ind = -2;
                }

                if(_ind === -1 || check) {
                    buffer.push(paragraph['elements'][i]);
                }
            } else {
                break;
            }
        }

        paragraph['elements'] = buffer;

        return paragraph;
    }

    /**
     * Удалить все тэги кроме bookmarkEnd,bookmarkStart,pPr в параграфе
     * @param {{}} paragraph
     * @returns {{}} Возвращает paragraph
     */
    deleteTextInParagraph(paragraph: convert.Element): convert.Element {
        let buffer = [];
        for(const element of paragraph['elements']) {
            const _name = element.name;
            if(_name === 'w:bookmarkEnd' || _name === 'w:bookmarkStart' || _name === 'w:pPr') {
                buffer.push(element);
            }
        }
        paragraph['elements'] = buffer;
        return paragraph;
    }

    deleteBookMarksInLastPR_FIX(paragraph: convert.Element): convert.Element {
        for(const [i, element] of paragraph['elements'].entries()) {
            const _name = element.name;
            if(_name == 'w:bookmarkEnd') {
                paragraph['elements'][i] = null;
                paragraph['elements'].splice(i,1);
            }
        }
        return paragraph;
    }
}
