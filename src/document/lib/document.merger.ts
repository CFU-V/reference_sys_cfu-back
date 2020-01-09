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
 * @version 1.1.2
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
    private checkValidateParams() {
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
            return {
                document,
                linksDocument
            };
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
            this.hyperlinks = convert.xml2js(links, {compact: false,trim: false});
            this.documentObject = convert.xml2js(xml, {compact: false,trim: false});
            this.document = xml;
            this.paragraphs = this.documentObject.elements[0].elements[0].elements;
            const response = this.getBookmarks(this.paragraphs);
            this.bookmarks = response.bookmarks;
            this.paragraphs = response.paragraphs;

            this.checkValidateParams();
        } catch (error) {
            console.error(`[LOAD] Ошибка! ${error}`);
            throw error;
        }
    }

    /**
     * Исправление поврежденных тэгов w:t после парсера
     * @param {[]} paragraphs
     * @returns {[]} paragraphs
     */
    private fixSpaceInTextParagraph(paragraphs: convert.Element[]): convert.Element[] {
        for (let i = 0; i < paragraphs.length; i++) {
            if (paragraphs[i].name === 'w:p') {
                if (!this.ObjectHasKey(paragraphs[i], 'elements')) {
                    continue;
                }
                const elementsLength = paragraphs[i].elements.length;

                for (let j = 0; j < elementsLength; j++) {
                    if (paragraphs[i].elements[j].name === 'w:r') {
                        if (!this.ObjectHasKey(paragraphs[i].elements[j], 'elements')) {
                            continue;
                        }
                        const wrLength = paragraphs[i].elements[j].elements.length;

                        for (let k = 0; k < wrLength; k++) {
                            if (paragraphs[i].elements[j].elements[k].name === 'w:t') {
                                if (!this.ObjectHasKey(paragraphs[i].elements[j].elements[k], 'elements')) {
                                    paragraphs[i].elements[j].elements[k].elements = [];
                                    paragraphs[i].elements[j].elements[k].elements.push({
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
     * @returns {Object}
     */
    private deleteGlobalBookmarks(bookmarks: IDocumentBookmark[], paragraphs: convert.Element[]): IMergedDocumentData {
        if (paragraphs.findIndex(i => i.name === 'w:bookmarkEnd') > -1) {
            for (let i = 0; i < bookmarks.length; i++) {
                if (!bookmarks[i].endInOtherPR && !bookmarks[i].endIsMinePR) {
                    for (let j = bookmarks[i].end; j > 0; j--) {
                        if (paragraphs[j].name === 'w:p') {
                            if (this.ObjectHasKey(paragraphs[j], 'elements')) {
                                paragraphs[j].elements.push(paragraphs[bookmarks[i].end]);
                                paragraphs[bookmarks[i].end] = null;
                                paragraphs.splice(bookmarks[i].end, 1);
                                bookmarks[i].endIsMinePR = true;
                                bookmarks[i].end = j;

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
            return {
                paragraphs,
                bookmarks
            };
        } else {
            return {
                paragraphs,
                bookmarks
            };
        }
    }

    /**
     * @param {*} object
     */
    private isNullOrUndefined(object): boolean {
        return object === null || object === undefined;
    }

    /**
     * Удалить сломанные закладки
     * @param {[]} bookmarks
     * @returns {[]} bookmarks
     */
    private removeBrokenBookMarks(bookmarks: IDocumentBookmark[]) {
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
    private computingLinks(
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
    ): IMergedDocumentData  {
        // ? #1 Избежать системных закладок и работать с закладками которые есть в обоих файлах
        // ? #2 Если количество параграфов совпадает
        // ? #3 Если в чайлд больше параграфов чем в мейн
        // ? #4 Если в чайлд меньше параграфов чем в мейн
        // !Исправить, после замены параграфов,текстов - заменить ID's на мейн
        try {
            this.checkValidateParams();
            const objectXml = convert.xml2js(doc.xml, {
                compact: false,
                trim: false
            }); // Конвертируем XML в Array of Object;
            const objectLinksXml = convert.xml2js(linksXml, {
                compact: false,
                trim: false
            }); // Конвертируем XML в Array of Object;

            const documentData: IMergedDocumentData = this.getBookmarks(objectXml.elements[0].elements[0].elements);
            let bookmarksXml = documentData.bookmarks;
            let paragraphsXml = documentData.paragraphs;

            for (const bookmarkXml of bookmarksXml) {

                if (!bookmarkXml.name) {
                    continue;
                }

                bookmarkXml.name = bookmarkXml.name.toString();

                let foundPos = bookmarkXml.name.indexOf("_", 0);
                if (foundPos < 0) continue;

                let ActionModule = bookmarkXml.name.slice(0, foundPos);
                let ActionID = bookmarkXml.name.slice(foundPos + 1);

                paragraphsXml = this.computingLinks(bookmarkXml.start, bookmarkXml.end, paragraphsXml, objectLinksXml);

                if (ActionModule === "ДобавитьС") {
                    const responseOfModule = this.ModuleOfAddWord(doc, mainParagraphs, mainBookmarks, paragraphsXml, bookmarkXml, ActionID, bookmarkXml.id);
                    mainParagraphs = responseOfModule.mainParagraphs;
                    mainBookmarks = responseOfModule.mainBookmarks;
                    paragraphsXml = responseOfModule.paragraphsXml;
                } else if (ActionModule === "Заменить") {
                    const responseOfModule = this.ModuleOfChanges(doc, mainParagraphs, mainBookmarks, linksXml, paragraphsXml, bookmarkXml, objectLinksXml, ActionID);
                    mainParagraphs = responseOfModule.mainParagraphs;
                    mainBookmarks = responseOfModule.mainBookmarks;
                    paragraphsXml = responseOfModule.paragraphsXml;
                } else if (ActionModule === "ДобавитьП") {
                    const responseOfModule = this.ModuleOfAddNewParagraph(doc, mainParagraphs, mainBookmarks, linksXml, paragraphsXml, bookmarkXml, objectLinksXml, ActionID);
                    mainParagraphs = responseOfModule.mainParagraphs;
                    mainBookmarks = responseOfModule.mainBookmarks;
                    paragraphsXml = responseOfModule.paragraphsXml;
                } else if (ActionModule === "Исключить") {
                    const responseOfModule = this.ModuleOfRemoveWord(doc, mainParagraphs, mainBookmarks, paragraphsXml, bookmarkXml, ActionID, bookmarkXml.id);
                    mainParagraphs = responseOfModule.mainParagraphs;
                    mainBookmarks = responseOfModule.mainBookmarks;
                    paragraphsXml = responseOfModule.paragraphsXml;
                } else if (ActionModule === "ЗаменитьС") {
                    const responseOfModule = this.ModuleOfReplaceWord(doc, mainParagraphs, mainBookmarks, paragraphsXml, bookmarkXml, ActionID, bookmarkXml.id);
                    mainParagraphs = responseOfModule.mainParagraphs;
                    mainBookmarks = responseOfModule.mainBookmarks;
                    paragraphsXml = responseOfModule.paragraphsXml;
                } else if (ActionModule === "Удаление") {
                    const responseOfModule = this.ModuleOfRemover(doc, mainParagraphs, mainBookmarks, paragraphsXml, ActionID);
                    mainParagraphs = responseOfModule.mainParagraphs;
                    mainBookmarks = responseOfModule.mainBookmarks;
                    paragraphsXml = responseOfModule.paragraphsXml;
                } else {
                    continue;
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
        if ((!mainParagraphs[index].elements) || index < 0 || index >= mainParagraphs.length) {
            return mainParagraphs;
        }

        let arrayOfElements = [];

        for (let i = mainParagraphs[index].elements.length - 1; i > 0; i--) {
            if (mainParagraphs[index].elements[i].name !== 'w:bookmarkEnd') {
                break;
            }
        }

        arrayOfElements
          .push({
              attributes: {
                  'w:rsidRPr': '00142DBF'
              },
              name: 'w:r',
              type: 'element',
              elements: [{
                  type: 'element',
                  name: 'w:rPr',
                  elements: [{
                      type: 'element',
                      name: 'w:color',
                      attributes: {
                          'w:val': '808080'
                      },
                  },],
              },
                  {
                      type: 'element',
                      name: 'w:t',
                      attributes: {
                          'xml:space': 'preserve'
                      },
                      elements: [{
                          type: 'text',
                          text: `(${text}: `,
                      },],
                  },
              ],
          });
        arrayOfElements
          .push({
              attributes: {
                  'w:rsidRPr': '00142DBF'
              },
              name: 'w:r',
              type: 'element',
              elements: [{
                  type: 'element',
                  name: 'w:fldChar',
                  attributes: {
                      'w:fldCharType': 'begin'
                  },
              },],
          });
        arrayOfElements
          .push({
              attributes: {
                  'w:rsidRPr': '00142DBF'
              },
              name: 'w:r',
              type: 'element',
              elements: [{
                  type: 'element',
                  name: 'w:t',
                  elements: [{
                      type: 'text',
                      text: `HYPERLINK "${process.env.APP_URL}/docview/${doc.id}?date=${doc.date.getFullYear()}-${doc.date.getMonth() + 1}-${doc.date.getDate()}"`,
                  },],
              },],
          });
        arrayOfElements
          .push({
              attributes: {
                  'w:rsidRPr': '00142DBF'
              },
              name: 'w:r',
              type: 'element',
              elements: [{
                  type: 'element',
                  name: 'w:fldChar',
                  attributes: {
                      'w:fldCharType': 'separate'
                  },
              },],
          });
        arrayOfElements
          .push({
              attributes: {
                  'w:rsidRPr': '00142DBF'
              },
              name: 'w:r',
              type: 'element',
              elements: [{
                  type: 'element',
                  name: 'w:rPr',
                  elements: [{
                      type: 'element',
                      name: 'w:color',
                      attributes: {
                          'w:val': '0000FF'
                      },
                  },],
              },
                  {
                      type: 'element',
                      name: 'w:t',
                      attributes: {
                          'xml:space': 'preserve'
                      },
                      elements: [{
                          type: 'text',
                          text: `${doc.category} ${doc.number} ${doc.date.getDate() > 9 ? doc.date.getDate() : '0' + doc.date.getDate()}-${(doc.date.getMonth() + 1) > 9 ? (doc.date.getMonth() + 1) : '0' + (doc.date.getMonth() + 1)}-${doc.date.getFullYear()}`,
                      },],
                  },
              ],
          });
        arrayOfElements
          .push({
              attributes: {
                  'w:rsidRPr': '00142DBF'
              },
              name: 'w:r',
              type: 'element',
              elements: [{
                  type: 'element',
                  name: 'w:fldChar',
                  attributes: {
                      'w:fldCharType': 'end'
                  },
              },],
          });
        arrayOfElements
          .push({
              attributes: {
                  'w:rsidRPr': '00142DBF'
              },
              name: 'w:r',
              type: 'element',
              elements: [{
                  type: 'element',
                  name: 'w:rPr',
                  elements: [{
                      type: 'element',
                      name: 'w:color',
                      attributes: {
                          'w:val': '808080'
                      },
                  },],
              },
                  {
                      type: 'element',
                      name: 'w:t',
                      elements: [{
                          type: 'text',
                          text: ` )`,
                      },],
                  },
              ],
          });

        for (const el of arrayOfElements) {
            mainParagraphs[index].elements.push(el);
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
            let bookmarks = [];
            let bookMarkIsOpen = false;
            let RangeWR_Tag = [];
            for (const [i, paragraph] of paragraphs.entries()) {
                if (paragraph.name === 'w:p') {
                    bookMarkIsOpen = false;
                    if (!this.ObjectHasKey(paragraph, 'elements')) {
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
                                rangeWRtag: -1,
                            });
                            if (elName !== null) {
                                RangeWR_Tag.push({
                                    range: 0,
                                    end: false,
                                    id: parseInt(elId.toString(), 10),
                                });
                            }
                        } else if (element.name === 'w:bookmarkEnd') {
                            const elId = element.attributes['w:id'];
                            const index = bookmarks.findIndex(item => item.id == elId);
                            const index_WrRange = RangeWR_Tag.findIndex(item => item.id == elId);
                            if (index > -1) {
                                bookmarks[index].end = i;
                                bookmarks[index].endInOtherPR = (bookMarkIsOpen && (bookmarks[index].end != bookmarks[index].start));
                                bookmarks[index].endIsMinePR = (bookmarks[index].end == bookmarks[index].start) || (bookMarkIsOpen == false);
                                if (bookmarks[index].name !== null && index_WrRange > -1) {
                                    bookmarks[index].rangeWRtag = RangeWR_Tag[index_WrRange].range;
                                    RangeWR_Tag[index_WrRange].end = true;
                                }
                            }
                        } else if (element.name === "w:r") {
                            for (let j = 0; j < RangeWR_Tag.length; j++) {
                                if (RangeWR_Tag[j].end !== true) RangeWR_Tag[j].range += 1;
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
                    const index_WrRange = RangeWR_Tag.findIndex(item => item.id == id);
                    if (index > -1) {
                        bookmarks[index].end = i;
                        bookmarks[index].endInOtherPR = false;
                        bookmarks[index].endIsMinePR = false;

                        if (bookmarks[index].name !== null && index_WrRange > -1) {
                            bookmarks[index].rangeWRtag = RangeWR_Tag[index_WrRange].range;
                            RangeWR_Tag[index_WrRange].end = true;
                        }
                    }
                }
            }

            bookmarks = this.removeBrokenBookMarks(bookmarks);
            const response = this.deleteGlobalBookmarks(bookmarks, paragraphs);

            bookmarks = response.bookmarks;
            paragraphs = response.paragraphs;

            for (let i = 0; i < bookmarks.length; i++) {
                if (bookmarks[i].endInOtherPR) {
                    bookmarks[i].end -= 1;
                }
            }

            for (let i = 0; i < bookmarks.length; i++) {
                const tempNum = (bookmarks[i].end - bookmarks[i].start) + 1;
                bookmarks[i].countParagraphs = (tempNum <= 0 ? 1 : tempNum);
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
        let pr = paragraphs.slice((start + 1), (end + 1));
        for (let i = 0; i < pr.length; i++) pr[i] = this.deleteBookMarkEndStartInPR(pr[i]);
        return pr;
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
            for (let item of newParagraphs) {
                paragraphs.splice(start + 1, 0, item);
            }
            return paragraphs;
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
    private replaceTextFromOtherParagraph(paragraph: convert.Element, otherParagraph: convert.Element, check: boolean): convert.Element {
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
    private deleteTextInParagraph(paragraph: convert.Element): convert.Element {
        const elements = [];
        for (const element of paragraph.elements) {
            if (element.name === 'w:bookmarkEnd' || element.name === 'w:bookmarkStart' || element.name === 'w:pPr') {
                elements.push(element);
            }
        }
        paragraph.elements = elements;
        return paragraph;
    }

    /**
     * Удалить все bookmarkEnd,bookmarkStart в параграфе
     * @param {{}} paragraph
     * @returns {{}} Возвращает paragraph
     */
    private deleteBookMarkEndStartInPR(paragraph: convert.Element): convert.Element {
        try {
            const elements = [];
            for (const element of paragraph.elements) {
                if (element.name !== 'w:bookmarkEnd' && element.name !== 'w:bookmarkStart') {
                    elements.push(element);
                }
            }
            paragraph.elements = null;
            paragraph.elements = elements;
            return paragraph;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Удалить все bookmarkEnd в параграфе
     * @param {{}} paragraph
     * @returns {{}} Возвращает paragraph
     */
    private deleteBookMarkEndInPR(paragraph: convert.Element): convert.Element {
        try {
            const elements = [];
            for (const element of paragraph.elements) {
                if (element.name !== 'w:bookmarkEnd') {
                    elements.push(element);
                }
            }
            paragraph.elements = null;
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
    private ObjectHasKey(object, key): boolean {
        return object ? Object.prototype.hasOwnProperty.call(object, key) : false;
    }

    // Modules

    /**
     * Модуль добавления параграфов
     * @param {{}[]} mainParagraphs
     * @param {{}[]} mainBookmarks
     * @param {String} doc
     * @param {String} linksXml
     * @param {{}[]} paragraphsXml
     * @param {Object} bookmarkXml
     * @param {Number} ActionID
     */
    private ModuleOfAddNewParagraph(doc, mainParagraphs, mainBookmarks, linksXml, paragraphsXml, bookmarkXml, objectLinksXml, ActionID) {

        if (ActionID.indexOf('N') <= 0) {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                paragraphsXml: paragraphsXml,
            };
        }

        let NewNameBK = ActionID.indexOf('N') > 0 ? ActionID.slice(ActionID.indexOf('N') + 1) : "";
        ActionID = ActionID.slice(0, ActionID.indexOf('N'));

        const mainBookmarkIndex = mainBookmarks.findIndex(i => i.name === ActionID);

        if (mainBookmarkIndex === -1) {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                doc: doc,
                linksXml: linksXml,
                paragraphsXml: paragraphsXml,
                bookmarkXml: bookmarkXml,
            };
        }

        if (bookmarkXml.countParagraphs < 1 || NewNameBK == "") {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                paragraphsXml: paragraphsXml,
            };
        }
        //------------------------------------------
        if (mainBookmarks[mainBookmarkIndex].endInOtherPR === true) {

            let ChangeBookMarkEnd = null;

            if ((mainBookmarks[mainBookmarkIndex].end + 1) >= mainParagraphs.length) {
                console.log(`[WARNING][ModuleOfAddNewParagraph] Overflow array of Paragraphs. End + 1 of bookmark > array of Paragraphs. Bookmark name: ${mainBookmarks[mainBookmarkIndex].name}`)
                return {
                    mainParagraphs: mainParagraphs,
                    mainBookmarks: mainBookmarks,
                    paragraphsXml: paragraphsXml,
                };
            }

            if (!mainParagraphs[(mainBookmarks[mainBookmarkIndex].end + 1)].elements) {
                console.log(`[WARNING][ModuleOfAddNewParagraph] Not find the elements of paragraph. End + 1 of bookmark. Bookmark name: ${mainBookmarks[mainBookmarkIndex].name}`)
                return {
                    mainParagraphs: mainParagraphs,
                    mainBookmarks: mainBookmarks,
                    paragraphsXml: paragraphsXml,
                };
            }

            for (let j = 0; j < mainParagraphs[(mainBookmarks[mainBookmarkIndex].end + 1)].elements.length; j++) {
                let item = mainParagraphs[(mainBookmarks[mainBookmarkIndex].end + 1)].elements[j];
                if (item.name) {
                    if (item.name == "w:bookmarkEnd") {
                        if (item.attributes['w:id'] == mainBookmarks[mainBookmarkIndex].id) {
                            ChangeBookMarkEnd = item;
                            mainParagraphs[(mainBookmarks[mainBookmarkIndex].end + 1)].elements.splice(j, 1);
                            break;
                        }
                    }
                }
            }

            if (ChangeBookMarkEnd === null || ChangeBookMarkEnd === undefined) {
                console.log(`[WARNING][ModuleOfAddNewParagraph] Not find a bookmarkend!. Bookmark name: ${mainBookmarks[mainBookmarkIndex].name}`)
                return {
                    mainParagraphs: mainParagraphs,
                    mainBookmarks: mainBookmarks,
                    paragraphsXml: paragraphsXml,
                };
            }

            mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements.push({
                attributes: {
                    'w:id': ChangeBookMarkEnd.attributes['w:id']
                },
                name: 'w:bookmarkEnd',
                type: 'element',
            });

            mainBookmarks[mainBookmarkIndex].endInOtherPR = false;
            mainBookmarks[mainBookmarkIndex].endIsMinePR = true;
        }

        let AddPRs = paragraphsXml.slice(bookmarkXml.start, bookmarkXml.end + 1);
        let CheckB_End = false;
        let NewIDBK = Date.now();

        for (let i = 0; i < AddPRs.length; i++) {
            if (AddPRs[i].elements) {
                for (let j = 0; j < AddPRs[i].elements.length; j++) {
                    if (AddPRs[i].elements[j].name) {
                        if (AddPRs[i].elements[j].name === "w:bookmarkStart") {
                            if (AddPRs[i].elements[j].attributes['w:id'] != bookmarkXml.id && AddPRs[i].elements[j].attributes['w:id'] != NewIDBK) {
                                AddPRs[i].elements.splice(j, 1);
                                j--;
                            }
                            else {
                                AddPRs[i].elements[j].attributes['w:name'] = NewNameBK;
                                AddPRs[i].elements[j].attributes['w:id'] = NewIDBK;
                            }
                        }
                        else if (AddPRs[i].elements[j].name === "w:bookmarkEnd") {
                            if (AddPRs[i].elements[j].attributes['w:id'] != bookmarkXml.id && AddPRs[i].elements[j].attributes['w:id'] != NewIDBK) {
                                AddPRs[i].elements.splice(j, 1);
                                j--;
                            }
                            else {
                                AddPRs[i].elements[j].attributes['w:id'] = NewIDBK;
                                CheckB_End = true;
                            }
                        }
                    }
                }
            }
        }

        if (CheckB_End === false) {
            AddPRs[AddPRs.length - 1].elements.push({
                attributes: {
                    'w:id': NewIDBK
                },
                name: 'w:bookmarkEnd',
                type: 'element',
            });
        }

        mainBookmarks.splice(mainBookmarkIndex + 1, 0, bookmarkXml);

        mainBookmarks[mainBookmarkIndex + 1].start = (mainBookmarks[mainBookmarkIndex].end + 1);
        mainBookmarks[mainBookmarkIndex + 1].end = (mainBookmarks[mainBookmarkIndex + 1].start + (bookmarkXml.countParagraphs - 1));
        mainBookmarks[mainBookmarkIndex + 1].id = NewIDBK;
        mainBookmarks[mainBookmarkIndex + 1].name = NewNameBK;
        mainBookmarks[mainBookmarkIndex + 1].endInOtherPR = false;
        mainBookmarks[mainBookmarkIndex + 1].endIsMinePR = true;

        for (let i = (mainBookmarkIndex + 2); i < mainBookmarks.length; i++) {
            mainBookmarks[i].start += bookmarkXml.countParagraphs;
            mainBookmarks[i].end += bookmarkXml.countParagraphs;
        }
        for (let i = 0; i < AddPRs.length; i++)
            mainParagraphs.splice(mainBookmarks[mainBookmarkIndex + 1].start + i, 0, AddPRs[i]);

        mainParagraphs = this.addLinkOfChild(mainParagraphs, mainBookmarks[mainBookmarkIndex + 1].end, doc, 'Изменение от');

        return {
            mainParagraphs: mainParagraphs,
            mainBookmarks: mainBookmarks,
            paragraphsXml: paragraphsXml,
        };
    }

    /**
     * Модуль изменения/замены параграфов
     * @param {{}[]} mainParagraphs
     * @param {{}[]} mainBookmarks
     * @param {String} doc
     * @param {String} linksXml
     * @param {{}[]} paragraphsXml
     * @param {Object} bookmarkXml
     * @param {Number} ActionID
     */
    private ModuleOfChanges(doc, mainParagraphs, mainBookmarks, linksXml, paragraphsXml, bookmarkXml, objectLinksXml, ActionID) {
        const mainBookmarkIndex = mainBookmarks.findIndex(i => i.name === ActionID);

        if (mainBookmarkIndex === -1) {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                doc: doc,
                linksXml: linksXml,
                paragraphsXml: paragraphsXml,
                bookmarkXml: bookmarkXml,
            };
        }

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

        if (bookmarkXml.countParagraphs === mainBookmarks[mainBookmarkIndex].countParagraphs) {
            for (let j = 0; j < mainBookmarks[mainBookmarkIndex].countParagraphs; j++) {
                if (!(mainParagraphs[mainBookmarks[mainBookmarkIndex].start + j] && paragraphsXml[bookmarkXml.start + j])) {
                    continue;
                }
                mainParagraphs[mainBookmarks[mainBookmarkIndex].start + j] = this.replaceTextFromOtherParagraph(
                  mainParagraphs[mainBookmarks[mainBookmarkIndex].start + j],
                  paragraphsXml[bookmarkXml.start + j],
                  true);
            }

            let CountOfWR = 0;

            for (let i = mainBookmarks[mainBookmarkIndex].start; i <= mainBookmarks[mainBookmarkIndex].end; i++) {
                for (const el1 of mainParagraphs[i].elements) {
                    if (el1.name) {
                        if (el1.name === 'w:r') {
                            CountOfWR++;
                        }
                    }
                }
            }

            mainBookmarks[mainBookmarkIndex].rangeWRtag = CountOfWR;

            mainParagraphs = this.addLinkOfChild(mainParagraphs, mainBookmarks[mainBookmarkIndex].end, doc, IsText.length < 4 ? 'Утратил силу согласно' : 'Изменение от');
        }
        else {
            if (bookmarkXml.countParagraphs > mainBookmarks[mainBookmarkIndex].countParagraphs) {
                mainParagraphs[mainBookmarks[mainBookmarkIndex].start] = this.replaceTextFromOtherParagraph(mainParagraphs[mainBookmarks[mainBookmarkIndex].start], paragraphsXml[bookmarkXml.start], false);
                // ? Если местонахождение закладок с обоих файлах совпадает
                if (mainBookmarks[mainBookmarkIndex].endInOtherPR === bookmarkXml.endInOtherPR && mainBookmarks[mainBookmarkIndex].endIsMinePR === bookmarkXml.endIsMinePR) {
                    console.log('2.1.1')
                    const paragraphsCount = bookmarkXml.countParagraphs - mainBookmarks[mainBookmarkIndex].countParagraphs;
                    const PR = this.getRangeParagraphs(paragraphsXml, bookmarkXml.start, bookmarkXml.end);
                    for (let j = mainBookmarks[mainBookmarkIndex].start + 1; j <= mainBookmarks[mainBookmarkIndex].end; j++) {
                        delete mainParagraphs[j];
                    }
                    mainParagraphs = this.addNewParagraphs(
                      mainParagraphs,
                      PR,
                      mainBookmarks[mainBookmarkIndex].start,
                      mainBookmarks[mainBookmarkIndex].end,
                    );
                    mainBookmarks[mainBookmarkIndex].end += paragraphsCount;
                    mainBookmarks[mainBookmarkIndex].countParagraphs += paragraphsCount;
                    for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                        mainBookmarks[j].start += paragraphsCount;
                        mainBookmarks[j].end += paragraphsCount;
                    }

                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end] = this.deleteBookMarkEndInPR(mainParagraphs[mainBookmarks[mainBookmarkIndex].end]);

                    // Фикс закладок
                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                      .push({
                          attributes: {
                              'w:id': mainBookmarks[mainBookmarkIndex].id
                          },
                          name: 'w:bookmarkEnd',
                          type: 'element',
                      });
                }
                else {
                    console.log('2.1.2')

                    const paragraphsCount = bookmarkXml.countParagraphs - mainBookmarks[mainBookmarkIndex].countParagraphs;
                    const PR = this.getRangeParagraphs(
                      paragraphsXml,
                      bookmarkXml.start,
                      bookmarkXml.end,
                    );
                    for (let j = mainBookmarks[mainBookmarkIndex].start + 1; j <= mainBookmarks[mainBookmarkIndex].end; j++) {
                        delete mainParagraphs[j];
                    }
                    mainParagraphs = this.addNewParagraphs(
                      mainParagraphs,
                      PR,
                      mainBookmarks[mainBookmarkIndex].start,
                      mainBookmarks[mainBookmarkIndex].end,
                    );
                    mainBookmarks[mainBookmarkIndex].end += paragraphsCount;
                    mainBookmarks[mainBookmarkIndex].countParagraphs += paragraphsCount;
                    for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                        mainBookmarks[j].start += paragraphsCount;
                        mainBookmarks[j].end += paragraphsCount;
                    }

                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end] = this.deleteBookMarkEndInPR(mainParagraphs[mainBookmarks[mainBookmarkIndex].end]);

                    // Фикс закладок
                    if (mainBookmarks[mainBookmarkIndex].endInOtherPR !== true) {
                        mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                          .push({
                              attributes: {
                                  'w:id': mainBookmarks[mainBookmarkIndex].id
                              },
                              name: 'w:bookmarkEnd',
                              type: 'element',
                          });
                    }
                }
            }
            else {
                mainParagraphs[mainBookmarks[mainBookmarkIndex].start] = this.replaceTextFromOtherParagraph(mainParagraphs[mainBookmarks[mainBookmarkIndex].start], paragraphsXml[mainBookmarks[mainBookmarkIndex].start], false);
                if (mainBookmarks[mainBookmarkIndex].endInOtherPR === bookmarkXml.endInOtherPR && mainBookmarks[mainBookmarkIndex].endIsMinePR === bookmarkXml.endIsMinePR) {

                    console.log('2.2.1')
                    const paragraphsCount = bookmarkXml.countParagraphs - mainBookmarks[mainBookmarkIndex].countParagraphs;

                    for (let j = mainBookmarks[mainBookmarkIndex].start + 1; j <= mainBookmarks[mainBookmarkIndex].end; j++) {
                        mainParagraphs.splice(mainBookmarks[mainBookmarkIndex].start + 1, 1);
                    }

                    if (bookmarkXml.countParagraphs > 1) {
                        const PR = this.getRangeParagraphs(paragraphsXml, bookmarkXml.start, bookmarkXml.end);
                        mainParagraphs = this.addNewParagraphs(mainParagraphs, PR, mainBookmarks[mainBookmarkIndex].start, mainBookmarks[mainBookmarkIndex].end);
                    }

                    mainBookmarks[mainBookmarkIndex].end += paragraphsCount;
                    mainBookmarks[mainBookmarkIndex].countParagraphs += paragraphsCount;

                    for (let j = (mainBookmarkIndex + 1); j < mainBookmarks.length; j++) {
                        mainBookmarks[j].start += paragraphsCount;
                        mainBookmarks[j].end += paragraphsCount;
                    }

                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end] = this.deleteBookMarkEndInPR(mainParagraphs[mainBookmarks[mainBookmarkIndex].end]);

                    // Фикс закладок
                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                      .push(
                        {
                            attributes: {
                                'w:id': mainBookmarks[mainBookmarkIndex].id,
                            },
                            name: 'w:bookmarkEnd',
                            type: 'element',
                        }
                      );
                }
                else {
                    console.log('2.2.2')

                    const paragraphsCount = bookmarkXml.countParagraphs - mainBookmarks[mainBookmarkIndex].countParagraphs;
                    for (let j = mainBookmarks[mainBookmarkIndex].start + 1; j <= mainBookmarks[mainBookmarkIndex].end; j++) {
                        mainParagraphs.splice(mainBookmarks[mainBookmarkIndex].start + 1, 1);
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
                          mainBookmarks[mainBookmarkIndex].start,
                          mainBookmarks[mainBookmarkIndex].end,
                        );
                    }
                    mainBookmarks[mainBookmarkIndex].end += paragraphsCount;
                    mainBookmarks[mainBookmarkIndex].countParagraphs += paragraphsCount;
                    for (let j = mainBookmarkIndex + 1; j < mainBookmarks.length; j++) {
                        mainBookmarks[j].start += paragraphsCount;
                        mainBookmarks[j].end += paragraphsCount;
                    }

                    mainParagraphs[mainBookmarks[mainBookmarkIndex].end] = this.deleteBookMarkEndInPR(mainParagraphs[mainBookmarks[mainBookmarkIndex].end]);

                    // Фикс закладок
                    if (mainBookmarks[mainBookmarkIndex].endInOtherPR !== true) {
                        mainParagraphs[mainBookmarks[mainBookmarkIndex].end].elements
                          .push({
                              attributes: {
                                  'w:id': mainBookmarks[mainBookmarkIndex].id
                              },
                              name: 'w:bookmarkEnd',
                              type: 'element',
                          });
                    }

                }
            }

            let CountOfWR = 0;

            for (let i = mainBookmarks[mainBookmarkIndex].start; i <= mainBookmarks[mainBookmarkIndex].end; i++) {
                for (const el1 of mainParagraphs[i].elements) {
                    if (el1.name) {
                        if (el1.name === 'w:r') {
                            CountOfWR++;
                        }
                    }
                }
            }

            mainBookmarks[mainBookmarkIndex].rangeWRtag = CountOfWR;

            mainParagraphs = this.addLinkOfChild(mainParagraphs, mainBookmarks[mainBookmarkIndex].end, doc, IsText.length < 4 ? 'Удалено от' : 'Изменение от');
        }

        return {
            mainParagraphs: mainParagraphs,
            mainBookmarks: mainBookmarks,
            doc: doc,
            linksXml: linksXml,
            paragraphsXml: paragraphsXml,
            bookmarkXml: bookmarkXml,
        };

    }

    /**
     * Модуль удаления параграфов
     * @param {{}[]} mainParagraphs
     * @param {{}[]} mainBookmarks
     * @param {{}[]} paragraphsXml
     * @param {Number} ActionID
     */
    private ModuleOfRemover(doc, mainParagraphs, mainBookmarks, paragraphsXml, ActionID) {
        const mainBookmarkIndex = mainBookmarks.findIndex(i => i.name === ActionID);

        if (mainBookmarkIndex === -1) {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                paragraphsXml: paragraphsXml,
            };
        }
        //--------------------------------------------
        if (mainBookmarks[mainBookmarkIndex].countParagraphs > 1) mainParagraphs.splice(mainBookmarks[mainBookmarkIndex].start + 1, (mainBookmarks[mainBookmarkIndex].countParagraphs - 1));

        mainBookmarks[mainBookmarkIndex].end -= (mainBookmarks[mainBookmarkIndex].countParagraphs - 1);
        if (mainBookmarks[mainBookmarkIndex].end < mainBookmarks[mainBookmarkIndex].start) mainBookmarks[mainBookmarkIndex].end = mainBookmarks[mainBookmarkIndex].start;

        for (let i = mainBookmarkIndex + 1; i < mainBookmarks.length; i++) {
            mainBookmarks[i].start -= (mainBookmarks[mainBookmarkIndex].countParagraphs - 1);
            mainBookmarks[i].end -= (mainBookmarks[mainBookmarkIndex].countParagraphs - 1);

            if (mainBookmarks[i].end < mainBookmarks[i].start) mainBookmarks[i].end = mainBookmarks[i].start;
        }

        mainBookmarks[mainBookmarkIndex].countParagraphs = 1;

        let flag = 0;

        let ChangePR = [];

        for (const el of mainParagraphs[mainBookmarks[mainBookmarkIndex].start].elements) {
            if (el.name !== 'w:r') {
                ChangePR.push(el);
            }
            else {

                if (flag === 0) {
                    let IsText = "";
                    if (el.elements) {
                        for (const el2 of el.elements) {
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

                    let ThePoint = "";
                    let foundPos = IsText.indexOf(" ", 0);
                    if (foundPos < 0) ThePoint = "";
                    else ThePoint = IsText.slice(0, foundPos);

                    if (ThePoint != "") {
                        for (let k = 0; k < ThePoint.length; k++) {
                            if (!(ThePoint[k] == "." || parseInt(ThePoint[k]) !== NaN)) {
                                ThePoint = "";
                                break;
                            }
                        }
                    }

                    flag = 1;

                    ChangePR
                      .push({
                          attributes: {
                              'w:rsidRPr': '00142DBF'
                          },
                          name: 'w:r',
                          type: 'element',
                          elements: [{
                              type: 'element',
                              name: 'w:rPr',
                              elements: [{
                                  type: 'element',
                                  name: 'w:color',
                                  attributes: {
                                      'w:val': '808080'
                                  },
                              },],
                          },
                              {
                                  type: 'element',
                                  name: 'w:t',
                                  attributes: {
                                      'xml:space': 'preserve'
                                  },
                                  elements: [{
                                      type: 'text',
                                      text: `${ThePoint} Утратил силу согласно: (`,
                                  },],
                              },
                          ],
                      });
                    ChangePR
                      .push({
                          attributes: {
                              'w:rsidRPr': '00142DBF'
                          },
                          name: 'w:r',
                          type: 'element',
                          elements: [{
                              type: 'element',
                              name: 'w:fldChar',
                              attributes: {
                                  'w:fldCharType': 'begin'
                              },
                          },],
                      });
                    ChangePR
                      .push({
                          attributes: {
                              'w:rsidRPr': '00142DBF'
                          },
                          name: 'w:r',
                          type: 'element',
                          elements: [{
                              type: 'element',
                              name: 'w:t',
                              elements: [{
                                  type: 'text',
                                  text: `HYPERLINK "${process.env.APP_URL}/docview/${doc.id}?date=${doc.date.getFullYear()}-${doc.date.getMonth() + 1}-${doc.date.getDate()}"`,
                              },],
                          },],
                      });
                    ChangePR
                      .push({
                          attributes: {
                              'w:rsidRPr': '00142DBF'
                          },
                          name: 'w:r',
                          type: 'element',
                          elements: [{
                              type: 'element',
                              name: 'w:fldChar',
                              attributes: {
                                  'w:fldCharType': 'separate'
                              },
                          },],
                      });
                    ChangePR
                      .push({
                          attributes: {
                              'w:rsidRPr': '00142DBF'
                          },
                          name: 'w:r',
                          type: 'element',
                          elements: [{
                              type: 'element',
                              name: 'w:rPr',
                              elements: [{
                                  type: 'element',
                                  name: 'w:color',
                                  attributes: {
                                      'w:val': '0000FF'
                                  },
                              },],
                          },
                              {
                                  type: 'element',
                                  name: 'w:t',
                                  attributes: {
                                      'xml:space': 'preserve'
                                  },
                                  elements: [{
                                      type: 'text',
                                      text: `${doc.category} ${doc.number} ${doc.date.getDate() > 9 ? doc.date.getDate() : '0' + doc.date.getDate()}-${(doc.date.getMonth() + 1) > 9 ? (doc.date.getMonth() + 1) : '0' + (doc.date.getMonth() + 1)}-${doc.date.getFullYear()}`,
                                  },],
                              },
                          ],
                      });
                    ChangePR
                      .push({
                          attributes: {
                              'w:rsidRPr': '00142DBF'
                          },
                          name: 'w:r',
                          type: 'element',
                          elements: [{
                              type: 'element',
                              name: 'w:fldChar',
                              attributes: {
                                  'w:fldCharType': 'end'
                              },
                          },],
                      });
                    ChangePR
                      .push({
                          attributes: {
                              'w:rsidRPr': '00142DBF'
                          },
                          name: 'w:r',
                          type: 'element',
                          elements: [{
                              type: 'element',
                              name: 'w:rPr',
                              elements: [{
                                  type: 'element',
                                  name: 'w:color',
                                  attributes: {
                                      'w:val': '808080'
                                  },
                              },],
                          },
                              {
                                  type: 'element',
                                  name: 'w:t',
                                  elements: [{
                                      type: 'text',
                                      text: ` )`,
                                  },],
                              },
                          ],
                      });
                }
            }
        }

        mainParagraphs[mainBookmarks[mainBookmarkIndex].start].elements = ChangePR;

        mainBookmarks[mainBookmarkIndex].rangeWRtag = 7;

        return {
            mainParagraphs: mainParagraphs,
            mainBookmarks: mainBookmarks,
            paragraphsXml: paragraphsXml,
        };
    }

    /**
     * Модуль добавления слова в параграф
     * @param {{}[]} mainParagraphs
     * @param {{}[]} mainBookmarks
     * @param {{}[]} paragraphsXml
     * @param {{}[]} bookmarkXml
     * @param {Number} ActionID
     */
    private ModuleOfAddWord(doc, mainParagraphs, mainBookmarks, paragraphsXml, bookmarkXml, ActionID, XMLBK_ID) {
        const mainBookmarkIndex = mainBookmarks.findIndex(i => i.name === ActionID);
        if (mainBookmarkIndex === -1) {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                paragraphsXml: paragraphsXml,
            };
        }
        //--------------------------------------------------------------------
        let CopyTextForm_ChildBookmark = [];
        let Flag_IsStartBookmark = false;
        let CountOfWRTags = bookmarkXml.rangeWRtag;

        if (CountOfWRTags < 1) {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                paragraphsXml: paragraphsXml,
            };
        }

        for (let i = bookmarkXml.start; i <= bookmarkXml.end; i++) {
            for (const el1 of paragraphsXml[i].elements) {
                if (el1.name) {
                    if (el1.name === 'w:bookmarkStart') {
                        if (el1.attributes['w:id'] == XMLBK_ID) {
                            Flag_IsStartBookmark = true;
                        }
                    }
                    else if (el1.name === 'w:bookmarkEnd') {
                        if (el1.attributes['w:id'] == XMLBK_ID) {
                            Flag_IsStartBookmark = false;
                        }
                    }
                    else if (Flag_IsStartBookmark) {
                        if (el1.name === 'w:r') {
                            CopyTextForm_ChildBookmark.push(el1);
                        }
                    }
                }
            }
        }
        //-------------------------------
        Flag_IsStartBookmark = false;
        CountOfWRTags = mainBookmarks[mainBookmarkIndex].rangeWRtag;

        for (let i = mainBookmarks[mainBookmarkIndex].start; i <= mainBookmarks[mainBookmarkIndex].end; i++) {
            for (let [j, el1] of mainParagraphs[i].elements.entries()) {
                if (el1.name) {
                    if (el1.name === 'w:bookmarkStart') {
                        if (el1.attributes['w:id'] == mainBookmarks[mainBookmarkIndex].id) {
                            Flag_IsStartBookmark = true;
                        }
                    } else if (el1.name === 'w:bookmarkEnd') {
                        if (el1.attributes['w:id'] == mainBookmarks[mainBookmarkIndex].id) {
                            Flag_IsStartBookmark = false;
                        }
                    }

                    if (Flag_IsStartBookmark && CountOfWRTags > 0) {
                        if (el1.name === 'w:r') {
                            CountOfWRTags--;
                            if (CountOfWRTags <= 0) {
                                for (const [k, Item] of CopyTextForm_ChildBookmark.entries()) mainParagraphs[i].elements.splice(j + 1 + k, 0, Item);
                                break;
                            }
                        }
                    }
                    else if (Flag_IsStartBookmark && CountOfWRTags <= 0) {
                        for (const [k, Item] of CopyTextForm_ChildBookmark.entries()) mainParagraphs[i].elements.splice(j + 1 + k, 0, Item);
                        break;
                    }

                }
            }
        }

        mainBookmarks[mainBookmarkIndex].rangeWRtag += CopyTextForm_ChildBookmark.length;

        mainParagraphs = this.addLinkOfChild(mainParagraphs, mainBookmarks[mainBookmarkIndex].end, doc, 'Изменение от');

        return {
            mainParagraphs: mainParagraphs,
            mainBookmarks: mainBookmarks,
            paragraphsXml: paragraphsXml,
        };
    }

    /**
     * Модуль удаления слова из параграфа
     * @param {{}[]} mainParagraphs
     * @param {{}[]} mainBookmarks
     * @param {{}[]} paragraphsXml
     * @param {{}[]} bookmarkXml
     * @param {Number} ActionID
     */
    private ModuleOfRemoveWord(doc, mainParagraphs, mainBookmarks, paragraphsXml, bookmarkXml, ActionID, XMLBK_ID) {
        const mainBookmarkIndex = mainBookmarks.findIndex(i => i.name === ActionID);
        if (mainBookmarkIndex === -1) {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                paragraphsXml: paragraphsXml,
            };
        }
        //--------------------------------------------------------------------
        let CopyTextForm_ChildBookmark = "";
        let Flag_IsStartBookmark = false;
        let CountOfWRTags = bookmarkXml.rangeWRtag;

        if (CountOfWRTags < 1 || mainBookmarks.rangeWRtag < 1) {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                paragraphsXml: paragraphsXml,
            };
        }

        for (let i = bookmarkXml.start; i <= bookmarkXml.end; i++) {
            for (const el1 of paragraphsXml[i].elements) {
                if (el1.name) {
                    if (el1.name === 'w:bookmarkStart') {
                        if (el1.attributes['w:id'] == XMLBK_ID) {
                            Flag_IsStartBookmark = true;
                        }
                    }
                    else if (el1.name === 'w:bookmarkEnd') {
                        if (el1.attributes['w:id'] == XMLBK_ID) {
                            Flag_IsStartBookmark = false;
                        }
                    }
                    else if (Flag_IsStartBookmark) {
                        if (el1.name === 'w:r') {
                            if (el1.elements) {
                                for (const el2 of el1.elements) {
                                    if (el2.name === 'w:t') {
                                        if (el2.elements) {
                                            for (const el3 of el2.elements) {
                                                if (el3.type === 'text') {
                                                    CopyTextForm_ChildBookmark += el3.text;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                }
            }
        }
        //-------------------------------
        CopyTextForm_ChildBookmark = CopyTextForm_ChildBookmark.trim();
        Flag_IsStartBookmark = false;
        CountOfWRTags = mainBookmarks[mainBookmarkIndex].rangeWRtag;

        for (let i = mainBookmarks[mainBookmarkIndex].start; i <= mainBookmarks[mainBookmarkIndex].end; i++) {
            for (let el1 of mainParagraphs[i].elements) {
                if (el1.name) {
                    if (el1.name === 'w:bookmarkStart') {
                        if (el1.attributes['w:id'] == mainBookmarks[mainBookmarkIndex].id) {
                            Flag_IsStartBookmark = true;
                        }
                    }
                    else if (el1.name === 'w:bookmarkEnd') {
                        if (el1.attributes['w:id'] == mainBookmarks[mainBookmarkIndex].id) {
                            Flag_IsStartBookmark = false;
                        }
                    }
                    else if (Flag_IsStartBookmark) {
                        if (el1.name === 'w:r') {
                            if (el1.elements) {
                                for (let el2 of el1.elements) {
                                    if (el2.name === 'w:t') {
                                        if (el2.elements) {
                                            for (let el3 of el2.elements) {
                                                if (el3.type === 'text') {
                                                    el3.text = this.replaceAll(el3.text, CopyTextForm_ChildBookmark, " ");
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                }
            }
        }

        mainParagraphs = this.addLinkOfChild(mainParagraphs, mainBookmarks[mainBookmarkIndex].end, doc, 'Изменение от');

        return {
            mainParagraphs: mainParagraphs,
            mainBookmarks: mainBookmarks,
            paragraphsXml: paragraphsXml,
        };
    }

    /**
     *
     * @param text
     * @param search
     * @param replacement
     */
    private replaceAll(text: string, search: string, replacement: string) {
        return text.split(search).join(replacement);
    }

    /**
     * Модуль замены слова в параграфе
     * @param {{}[]} mainParagraphs
     * @param {{}[]} mainBookmarks
     * @param {{}[]} paragraphsXml
     * @param {{}[]} bookmarkXml
     * @param {Number} ActionID
     */
    private ModuleOfReplaceWord(doc, mainParagraphs, mainBookmarks, paragraphsXml, bookmarkXml, ActionID, XMLBK_ID) {
        const mainBookmarkIndex = mainBookmarks.findIndex(i => i.name === ActionID);
        if (mainBookmarkIndex === -1) {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                paragraphsXml: paragraphsXml,
            };
        }
        //--------------------------------------------------------------------
        let CopyTextForm_ChildBookmark = [];
        let Flag_IsStartBookmark = false;
        let CountOfWRTags = bookmarkXml.rangeWRtag;

        if (CountOfWRTags < 1 || mainBookmarks.rangeWRtag < 1) {
            return {
                mainParagraphs: mainParagraphs,
                mainBookmarks: mainBookmarks,
                paragraphsXml: paragraphsXml,
            };
        }

        for (let i = bookmarkXml.start; i <= bookmarkXml.end; i++) {
            for (const el1 of paragraphsXml[i].elements) {
                if (el1.name) {
                    if (el1.name === 'w:bookmarkStart') {
                        if (el1.attributes['w:id'] == XMLBK_ID) {
                            Flag_IsStartBookmark = true;
                        }
                    }
                    else if (el1.name === 'w:bookmarkEnd') {
                        if (el1.attributes['w:id'] == XMLBK_ID) {
                            Flag_IsStartBookmark = false;
                        }
                    }
                    else if (Flag_IsStartBookmark && CountOfWRTags > 0) {
                        if (el1.name === 'w:r') {
                            CopyTextForm_ChildBookmark.push(el1);
                            CountOfWRTags--;
                        }
                    }
                }
            }
        }
        //-------------------------------
        Flag_IsStartBookmark = false;

        for (let i = mainBookmarks[mainBookmarkIndex].start; i <= mainBookmarks[mainBookmarkIndex].end; i++) {
            for (let j = 0; j < mainParagraphs[i].elements.length; j++) {
                let el1 = mainParagraphs[i].elements[j];
                if (el1.name) {
                    if (el1.name === 'w:bookmarkStart') {
                        if (el1.attributes['w:id'] == mainBookmarks[mainBookmarkIndex].id) {
                            Flag_IsStartBookmark = true;
                        }
                    }
                    else if (el1.name === 'w:bookmarkEnd') {
                        if (el1.attributes['w:id'] == mainBookmarks[mainBookmarkIndex].id) {
                            Flag_IsStartBookmark = false;
                            for (const [k, Item] of CopyTextForm_ChildBookmark.entries()) {
                                mainParagraphs[i].elements.splice(j + k, 0, Item);
                            }
                            break;
                        }
                    }
                    else if (Flag_IsStartBookmark) {
                        if (el1.name === 'w:r') {
                            mainParagraphs[i].elements.splice(j, 1);
                            j--;
                        }
                    }
                }
            }
        }

        mainBookmarks[mainBookmarkIndex].rangeWRtag = CopyTextForm_ChildBookmark.length;
        mainParagraphs = this.addLinkOfChild(mainParagraphs, mainBookmarks[mainBookmarkIndex].end, doc, 'Изменение от');

        return {
            mainParagraphs: mainParagraphs,
            mainBookmarks: mainBookmarks,
            paragraphsXml: paragraphsXml,
        };
    }


    //Class END
}
