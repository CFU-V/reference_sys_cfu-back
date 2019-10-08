"use strict";
const convert = require("xml-js");
const isNullOrUndefined = require("util").isNullOrUndefined;

/**
 * Класс для объединения содержимого документов в один главный документ
 * @version 1.0.3
 */
export default class DocumentMerger {

  /**
   * Инициализация основных переменных класса
   * * document XML главного документа
   * * document_object XML в виде объекта главного документа
   * * bookmarks закладки в виде массива объектов
   * * paragraphs параграфы в виде массива объектов
   * * hyperlinks массив ссылок гл. документа
   */
  constructor() {
    this.document = null;
    this.document_object = null;
    this.bookmarks = Array();
    this.paragraphs = Array();
    this.hyperlinks = null;
  }


  /**
   *
   */
  CheckValidateParams() {
    if (this.document == null || this.document == '') {
      console.error('[CheckValidateParams] Ошибка! document == null || ""');
      return true;
    }
    if (this.document_object == null || this.document_object == '') {
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
   * @param {string[]} mass_filexml Массив XML файллов (дочерних)
   * @param {string[]} mass_filexml_links Массив ссылок XML файллов (дочерних)
   * @returns {void}
   */
  async start(mass_filexml,mass_filexml_links) {
    if (this.CheckValidateParams()) return;
    for (let i = 0; i < mass_filexml.length; i++) {
      //console.log(i+2);
      try {
        const response = await this.GetOperation(this.paragraphs, this.bookmarks, mass_filexml[i], mass_filexml_links[i]);
        this.bookmarks = response['bookmarks'];
        this.paragraphs = response['paragraphs'];
      } catch (error) {
        console.error(`[Start] Ошибка при работе с файлом. ${error}`);
      }
    }
    console.log(this.bookmarks);
      console.log(this.paragraphs);
      this.document_object['elements'][0]['elements'][0]['elements'] = this.paragraphs;
      const document = convert.js2xml(this.document_object);
      const linksDocument = convert.js2xml(this.hyperlinks);
      return { document, linksDocument };
  }

  /**
   * Загрузить главный документ
   * @param {string} filexml XML документа
   * @param {string} links XML ссылки документа
   * @returns {void}
   */
  async load(filexml, links) {
    let parseXmlFile = null;
    let parseXmlFile_links = null;
    parseXmlFile = await convert.xml2js(filexml, {compact: false, spaces: 0, trim: false});
    parseXmlFile_links = await convert.xml2js(links, {compact: false, spaces: 0, trim: false});
    this.hyperlinks = parseXmlFile_links;
    this.document = filexml;
    this.document_object = parseXmlFile;
    this.bookmarks = await this.GetBookmarks(filexml);
    this.paragraphs = this.document_object['elements'][0]['elements'][0]['elements'];
    if (this.CheckValidateParams()) return;
    // Фикс закладок, удаляем глобальные закладки
    const _res = await this.DeleteGlobalBookmarks(this.bookmarks,this.paragraphs);
    this.bookmarks = _res['BK'];
    this.paragraphs = _res['PR'];
  }

  /**
   * Удалить глобальные закладки (гл. Документ)
   * @returns {void}
   */
  async DeleteGlobalBookmarks(bookmarks, paragraphs) {
    if (paragraphs.findIndex(i => i.name == "w:bookmarkEnd") > -1) {
      for (let i = 0; i < bookmarks.length; i++) {
        if (!(bookmarks[i].endInOtherPR == false && bookmarks[i].endIsMinePR == false)) continue;
        const _id = await bookmarks[i].id;
        let index = -1;
        try {
          index = await paragraphs.findIndex(i => (isNullOrUndefined(i) ? '' : i['attributes']['w:id']) == _id);
        } catch (error) {
          index = -1;
          console.error(`[DeleteGlobalBookmarks] ${error}`);
        }

        if (index > -1) {
          await paragraphs[bookmarks[i].end]['elements'].push(paragraphs[index]);
          paragraphs[index] = null;
          await paragraphs.splice(index,1);
          bookmarks[i].endIsMinePR = true;
        }
      }
      return { PR: paragraphs, BK: bookmarks }
    }
    else return { PR: paragraphs, BK: bookmarks }
  }

  /**
   * Сохранить главный документ
   * * Данный метод заменяет параграфы в document_object на те что в paragraphs
   * @returns {void}
   */
  async Save() {
    if (this.CheckValidateParams()) return;
    this.document_object['elements'][0]['elements'][0]['elements'] = this.paragraphs;
    this.DownLoad(this.document_object,'document.xml');
  }

  /**
   * Генерирование уникального ИД ссылкам и добавление ссылок в общий массив ссылок (Main документа)
   * @param {number} start
   * @param {number} end
   * @param {{}[]} paragraphs
   * @param {{}[]} links
   * @returns {{}[]} paragraphs
   */
  async ComputingLinks(start, end, paragraphs, links) {
    if (this.CheckValidateParams()) return;
    for(let i = start; i <= end; i++) {
      const _max_el = paragraphs[i]['elements'].length;
      if(_max_el < 1) continue;
      for(let j = 0; j < _max_el; j++) {
        const _name_el = paragraphs[i]['elements'][j]['name'];
        if(_name_el != 'w:hyperlink') continue;
        if(isNullOrUndefined(paragraphs[i]['elements'][j]['attributes'])) continue;
        if(isNullOrUndefined(paragraphs[i]['elements'][j]['attributes']['r:id'])) continue;
        const _dt_now_stamp = new Date();
        const _id = paragraphs[i]['elements'][j]['attributes']['r:id'];
        paragraphs[i]['elements'][j]['attributes']['r:id'] = 'rId' + _dt_now_stamp.getTime().toString();
        const _index = links['elements'][0]['elements'].findIndex(i => i.attributes.Id == _id);
        links['elements'][0]['elements'][_index]['attributes']['Id'] = 'rId' + _dt_now_stamp.getTime().toString();
        this.hyperlinks['elements'][0]['elements'].push(links['elements'][0]['elements'][_index]);
      }
    }
    return paragraphs;
  }

  /**
   * Основная функция
   * @param {{}[]} Paragraphs_main
   * @param {{}[]} Bookmarks_main
   * @param {string} filexml
   * @param {{}[]} mass_filexml_links
   * @returns {{bookmarks: {}[], paragraphs: {}[]}}
   */
  async GetOperation(Paragraphs_main, Bookmarks_main, filexml, mass_filexml_links) {
    // ? #1 Избежать системных закладок и работать с закладками которые есть в обоих файлах не более
    // ? #2 Если количество параграфов совпадает
    // ? #3 Если в чайлд больше параграфов чем в мейн
    // ? #4 Если в чайлд меньше параграфов чем в мейн
    // !Исправить, после замены параграфов,текстов - заменить ID's на мейн
    if (this.CheckValidateParams()) return;
    // Init
	  let Object_filexml = null;
	  let Object_filexml_links = null;
    let Bookmarks_filexml = Array();
    let Paragraphs_filexml = Array();
    //
	  Object_filexml = await convert.xml2js(filexml, {compact: false, spaces: 0, trim: false}); // Конвертируем XML в Array of Object
	  Object_filexml_links = await convert.xml2js(mass_filexml_links, {compact: false, spaces: 0, trim: false}); // Конвертируем XML в Array of Object
    Bookmarks_filexml = await this.GetBookmarks(filexml); // Получаем все закладки из данного документа
    Paragraphs_filexml = Object_filexml['elements'][0]['elements'][0]['elements']; // Достаем парагрфавы ввиде массива объектов
    // Фикс закладок, удаляем глобальные закладки
    const _res_FIX = await this.DeleteGlobalBookmarks(Bookmarks_filexml,Paragraphs_filexml);
    Bookmarks_filexml = _res_FIX['BK'];
    Paragraphs_filexml = _res_FIX['PR'];
    // * Старт процесса
    for (let i = 0; i < Bookmarks_filexml.length; i++) {
      // * ----------------[ #1 ]----------------------------
      const _name = Bookmarks_filexml[i].name;
      if (_name == "unknown") continue; // Это системные закладки
      const c = Bookmarks_main.findIndex(i => i.name == _name);
      if (c < 0) continue;
      const BKM_main = Bookmarks_main[c];
      Paragraphs_filexml = await this.ComputingLinks(Bookmarks_filexml[i].start, Bookmarks_filexml[i].end, Paragraphs_filexml, Object_filexml_links);
      // * ----------------[ #2 ]----------------------------
      if (Bookmarks_filexml[i].countParagraphs == BKM_main.countParagraphs) {
        //console.log('#2');
        for (let j = 0; j < BKM_main.countParagraphs; j++) {
          if (!(Paragraphs_main[BKM_main.start + j] && Paragraphs_filexml[Bookmarks_filexml[i].start + j])) continue;
          Paragraphs_main[BKM_main.start + j] = await this.ReplaceTextFromOtherParagraph(Paragraphs_main[BKM_main.start + j], Paragraphs_filexml[Bookmarks_filexml[i].start + j], true);
        }
      } else {
        // * ----------------[ #3 ]----------------------------
        if (Bookmarks_filexml[i].countParagraphs > BKM_main.countParagraphs) {
          //Paragraphs_main[BKM_main.start] = this.DeleteTextInParagraph(Paragraphs_main[BKM_main.start]);
          Paragraphs_main[BKM_main.start] = await this.ReplaceTextFromOtherParagraph(Paragraphs_main[BKM_main.start], Paragraphs_filexml[Bookmarks_filexml[i].start], false);
          //console.log(Paragraphs_filexml);
          // ? Если местонахождение закладок с обоих файлах совпадает
          if (BKM_main.endInOtherPR == Bookmarks_filexml[i].endInOtherPR && BKM_main.endIsMinePR == Bookmarks_filexml[i].endIsMinePR) {
            //console.log('#3-1');
            const pcount = Bookmarks_filexml[i].countParagraphs - BKM_main.countParagraphs;
            const PR = this.GetRangeParagraphs(Paragraphs_filexml,Bookmarks_filexml[i].start + 1,Bookmarks_filexml[i].end);
            for (let j = BKM_main.start + 1; j <= BKM_main.end; j++) {
              delete Paragraphs_main[j];
            }
            Paragraphs_main = this.AddNewParagraphs(Paragraphs_main,PR,BKM_main.start,BKM_main.end);
			      Bookmarks_main[c].end += pcount;
            Bookmarks_main[c].countParagraphs += pcount;
            for (let j = c + 1; j < Bookmarks_main.length; j++) {
              Bookmarks_main[j].start += pcount;
              Bookmarks_main[j].end += pcount;
            }
            await this.DeleteBookMarksInLastPR_FIX(Paragraphs_main[Bookmarks_main[c].end]);
            // Фикс закладок
            Paragraphs_main[Bookmarks_main[c].end]['elements'].push({attributes: {"w:id": Bookmarks_main[c].id}, name: 'w:bookmarkEnd', type: 'element'});
          } else {
            //console.log('#3-2');
            const pcount = Bookmarks_filexml[i].countParagraphs - BKM_main.countParagraphs;
            const PR = this.GetRangeParagraphs(Paragraphs_filexml,Bookmarks_filexml[i].start + 1,Bookmarks_filexml[i].end);
            for (let j = BKM_main.start + 1; j <= BKM_main.end; j++) {
              delete Paragraphs_main[j];
            }
            Paragraphs_main = this.AddNewParagraphs(Paragraphs_main,PR,BKM_main.start,BKM_main.end);
            Bookmarks_main[c].end += pcount;
			      Bookmarks_main[c].countParagraphs += pcount;
            for (let j = c + 1; j < Bookmarks_main.length; j++) {
              Bookmarks_main[j].start += pcount;
              Bookmarks_main[j].end += pcount;
            }
            await this.DeleteBookMarksInLastPR_FIX(Paragraphs_main[Bookmarks_main[c].end]);
            // Фикс закладок
            if (Bookmarks_main[c].endInOtherPR) {
              const _index = await Paragraphs_main[Bookmarks_main[c].end]['elements'].findIndex(i => i['name'] == 'w:bookmarkEnd');
              if (_index > -1) {
                Paragraphs_main[Bookmarks_main[c].end]['elements'][_index] = null;
                Paragraphs_main[Bookmarks_main[c].end]['elements'].splice(_index,1);
              }
            } else {
              Paragraphs_main[Bookmarks_main[c].end]['elements'].push({attributes: {"w:id": Bookmarks_main[c].id}, name: 'w:bookmarkEnd', type: 'element'});
            }
          }
        }
        // * ----------------[ #4 ]----------------------------
        else {
          //Paragraphs_main[BKM_main.start] = this.DeleteTextInParagraph(Paragraphs_main[BKM_main.start]);
          Paragraphs_main[BKM_main.start] = await this.ReplaceTextFromOtherParagraph(Paragraphs_main[BKM_main.start], Paragraphs_filexml[Bookmarks_filexml[i].start], false);
          // ? Если местонахождение закладок с обоих файлах совпадает
          if (BKM_main.endInOtherPR == Bookmarks_filexml[i].endInOtherPR && BKM_main.endIsMinePR == Bookmarks_filexml[i].endIsMinePR) {
            //console.log('#4-1');
            const pcount = Bookmarks_filexml[i].countParagraphs - BKM_main.countParagraphs;
            for (let j = BKM_main.start + 1; j <= BKM_main.end; j++) {
              Paragraphs_main.splice(BKM_main.start + 1, 1);
            }
            if (Bookmarks_filexml[i].countParagraphs > 1) {
              const PR = this.GetRangeParagraphs(
                Paragraphs_filexml,
                Bookmarks_filexml[i].start + 1,
                Bookmarks_filexml[i].end
              );
              Paragraphs_main = this.AddNewParagraphs(
                Paragraphs_main,
                PR,
                BKM_main.start,
                BKM_main.end
              );
            }
            Bookmarks_main[c].end += pcount;
            Bookmarks_main[c].countParagraphs += pcount;
            for (let j = c + 1; j < Bookmarks_main.length; j++) {
              Bookmarks_main[j].start += pcount;
              Bookmarks_main[j].end += pcount;
            }
            // Фикс закладок
            Paragraphs_main[Bookmarks_main[c].end]['elements'].push({attributes: {"w:id": Bookmarks_main[c].id}, name: 'w:bookmarkEnd', type: 'element'});
          } else {
            //console.log('#4-2');
            const pcount = Bookmarks_filexml[i].countParagraphs - BKM_main.countParagraphs;
            for (let j = BKM_main.start + 1; j <= BKM_main.end; j++) {
              Paragraphs_main.splice(BKM_main.start + 1, 1);
            }
            if (Bookmarks_filexml[i].countParagraphs > 1) {
              const PR = this.GetRangeParagraphs(Paragraphs_filexml,Bookmarks_filexml[i].start + 1,Bookmarks_filexml[i].end
              );
              Paragraphs_main = this.AddNewParagraphs(Paragraphs_main,PR,BKM_main.start,BKM_main.end);
            }
            Bookmarks_main[c].end += pcount;
            Bookmarks_main[c].countParagraphs += pcount;
            for (let j = c + 1; j < Bookmarks_main.length; j++) {
              Bookmarks_main[j].start += pcount;
              Bookmarks_main[j].end += pcount;
            }
            // Фикс закладок
            if (Bookmarks_main[c].endInOtherPR == true) {
              const _index = await Paragraphs_main[Bookmarks_main[c].end]['elements'].findIndex(i => i['name'] == 'w:bookmarkEnd');
              if (_index > -1) {
                Paragraphs_main[Bookmarks_main[c].end]['elements'][_index] = null;
                Paragraphs_main[Bookmarks_main[c].end]['elements'].splice(_index,1);
              }
            }
            else {
              Paragraphs_main[Bookmarks_main[c].end]['elements'].push({attributes: {"w:id": Bookmarks_main[c].id}, name: 'w:bookmarkEnd', type: 'element'});
            }
          }
        }
      }
    }
    return {
      paragraphs: Paragraphs_main,
      bookmarks: Bookmarks_main
    }
  }

  /**
   * Получить массив закладок из документа
   * @param {string} document
   * @returns {[]} Возвращает массив закладок из документа
   */
  async GetBookmarks(document) {
    const regexBookmarkName = /п_[а-я,0-9,-,_]+/i;
    const regexBookmarkId = /[0-9]+/i;
    const splitDocument = document.split("<");
    let massBookmarks = Array();
    let paragraphIsOpen = false;
    let bookMarkIsOpen = false;
    let countParagraphs = -1;
    let fix_ = -1;
    splitDocument.forEach(element => {
      //---------------------------------------
      if (element.includes("w:p ")) {
        countParagraphs++;
        fix_ = countParagraphs;
        paragraphIsOpen = true;
        bookMarkIsOpen = false;
      } else if (element.includes("/w:p>")) {
        paragraphIsOpen = false;
        fix_ += 1;
      }
      //---------------------------------------
      if (element.includes("w:bookmarkStart ")) {
        bookMarkIsOpen = true;
        const name = regexBookmarkName.exec(element) != null ? regexBookmarkName.exec(element)[0] : "unknown";
        const id = regexBookmarkId.exec(element) != null ? parseInt(regexBookmarkId.exec(element)[0]) : -1;
        if (id > -1) massBookmarks[id] = {
          start: countParagraphs,
          name: name,
          id: id,
          paragraphIsOpen: paragraphIsOpen
        };
      } else if (element.includes("w:bookmarkEnd ")) {
        const prBkIsOpen = (paragraphIsOpen && bookMarkIsOpen);
        const id = regexBookmarkId.exec(element) != null ? parseInt(regexBookmarkId.exec(element)[0]) : -1;
        if (id > -1) {
          let indexEnd = (prBkIsOpen ? countParagraphs - 1 : countParagraphs);
          if (indexEnd < massBookmarks[id].start) indexEnd = massBookmarks[id].start;
          const countParagraphsInBK = (indexEnd - massBookmarks[id].start) + 1;
          massBookmarks[id].end = indexEnd;
          massBookmarks[id].endInOtherPR = (prBkIsOpen && (massBookmarks[id].start != fix_));
          massBookmarks[id].endIsMinePR = ((paragraphIsOpen && bookMarkIsOpen == false) || (massBookmarks[id].start == fix_));
          massBookmarks[id].countParagraphs = countParagraphsInBK;
        }
      }
      //---------------------------------------
    });
    return massBookmarks;
  }

  /**
   * Получить ссылки гл. Документа Объект
   * @returns {void}
   */
  GetParamLinks() {
    return this.hyperlinks;
  }

  /**
   * Получить гл. Документ XML
   * @returns {void}
   */
  GetParamDocument() {
    return this.document;
  }

  /**
   * Получить гл. Документ Объект
   * @returns {void}
   */
  GetParamDocumentObject() {
    return this.document_object;
  }

  /**
   * Получить заклакди (из гл. Документа)
   * @returns {void}
   */
  GetParamBookmarks() {
    return this.bookmarks;
  }

  /**
   * Получить параграфы (из гл. Документа)
   * @returns {void}
   */
  GetParamParagraphs() {
    return this.paragraphs;
  }

  /**
   * Достать диапазон параграфов
   * @param {{}[]} paragraphs
   * @param {number} start
   * @param {number} end
   */
  GetRangeParagraphs(paragraphs, start, end) {
    return paragraphs.slice(start, end + 1);
  }

  /**
   * Скачать главный документ (document.xml, document.xml.rels)
   * @param {{}} document_object
   * @param {string} filename сохранить как
   * @example DownLoad(document_object,'document.xml');
   * @returns {void}
   */
  DownLoad(document_object, filename) {
    if (this.CheckValidateParams()) return;
    if (filename == "" || filename == 'undefined') {
      console.error('[DownLoad] Ошибка! filename == "" || null');
      return;
    }
    var xml = convert.js2xml(document_object);
    var blob = new Blob([xml], {type: "application/xml"});
    FileSaver.saveAs(blob, filename);

    var xml_links = convert.js2xml(this.hyperlinks);
    var blob_links = new Blob([xml_links], {type: "application/xml"});
    FileSaver.saveAs(blob_links, 'document.xml.rels');
  }

  /**
   * Вставить параграфы в paragraphs от start до end из newParagraphs
   * @param {{}[]} paragraphs
   * @param {{}[]} newParagraphs
   * @param {number} start
   * @param {number} end
   * @returns {{}[]} Возвращает новый объединенный параграф
   */
  AddNewParagraphs(paragraphs, newParagraphs, start, end) {
    if (newParagraphs.length < 0) {
      console.error('[AddNewParagraphs] Ошибка! Массив newParagraphs пуст');
      return paragraphs;
    }
    let NewParagraph = paragraphs.slice(0, start + 1);
    NewParagraph = NewParagraph.concat(newParagraphs);
    NewParagraph = NewParagraph.concat(paragraphs.slice(end + 1, paragraphs.length));
    return NewParagraph;
  }

  /**
   * Заменить тэги в paragraph на те что в otheParagraph кроме bookmarkStart,bookmarkEnd
   * @param {{}} paragraph
   * @param {{}} otheParagraph
   * @returns {{}} Возвращает paragraph
   */
  async ReplaceTextFromOtherParagraph(paragraph, otheParagraph, check) {

    let _Buffer = [];
    const _len1 = paragraph['elements'].length;
    const _len2 = otheParagraph['elements'].length;

    for(let i = 0; i < _len1; i++) {
      const _name = paragraph['elements'][i]['name'];
      if(!(_name == 'w:bookmarkEnd' || _name == 'w:bookmarkStart' || _name == 'w:pPr')) break;
      else
      {
        if(_name == 'w:pPr') {
          const _ind = await otheParagraph['elements'].findIndex(i => i['name'] == 'w:pPr');
          if(_ind > -1) await _Buffer.push(otheParagraph['elements'][_ind]);
          else await _Buffer.push(paragraph['elements'][i]);
        }
        else await _Buffer.push(paragraph['elements'][i]);
      }
    }

    for(let i = 0; i < _len2; i++) {
      const _name = otheParagraph['elements'][i]['name'];
      if((_name == 'w:bookmarkEnd' || _name == 'w:bookmarkStart' || _name == 'w:pPr')) continue;
      else await _Buffer.push(otheParagraph['elements'][i]);
    }

    for(let i = _len1-1; i > 0; i--) {
      const _name = paragraph['elements'][i]['name'];

      if(_name == 'w:bookmarkEnd') {

        let _id = -1;
        let _ind = -1;

        try {
          _id = paragraph['elements'][i]['attributes']['w:id'];
        } catch (error) {
          console.error(`[ReplaceTextFromOtherParagraph | id] ${error}`);
          _id = -1;
        }

        try {
          _ind = await _Buffer.findIndex(i => (isNullOrUndefined(i['attributes']['w:id']) ? '' : i['attributes']['w:id']) == _id);
        } catch (error) {
          _ind = -2;
        }

        if(_ind == -1 || check) await _Buffer.push(paragraph['elements'][i]);
      }
      else break;
    }

    paragraph['elements'] = _Buffer;

    return paragraph;
  }

  /**
   * Удалить все тэги кроме bookmarkEnd,bookmarkStart,pPr в параграфе
   * @param {{}} paragraph
   * @returns {{}} Возвращает paragraph
   */
  DeleteTextInParagraph(paragraph) {
    let _Buffer = [];
    for(let i = 0; i < paragraph['elements'].length; i++) {
      const _name = paragraph['elements'][i]['name'];
      if(_name == 'w:bookmarkEnd' || _name == 'w:bookmarkStart' || _name == 'w:pPr') {
        _Buffer.push(paragraph['elements'][i]);
      }
    }
    paragraph['elements'] = _Buffer;
    return paragraph;
  }

  async DeleteBookMarksInLastPR_FIX(paragraph) {
    let _Buffer = [];
    for(let i = 0; i < paragraph['elements'].length; i++) {
      const _name = paragraph['elements'][i]['name'];
      if(_name == 'w:bookmarkEnd') {
        paragraph['elements'][i] = null;
        paragraph['elements'].splice(i,1);
      }
    }
    return paragraph;
  }
}
