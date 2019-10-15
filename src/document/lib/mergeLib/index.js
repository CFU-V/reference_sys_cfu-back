"use strict";
const convert = require("xml-js");


/**
 * Класс для объединения содержимого документов в один главный документ
 * @version 1.0.5
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
    if (this.hyperlinks['elements'][0]['elements'].length <= 0 || this.hyperlinks == null) {
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
   start(mass_filexml, mass_filexml_links) {
    if (this.CheckValidateParams()) return;

    for (let i = 0; i < mass_filexml.length; i++) {
      try {
        const response =  this.GetOperation(this.paragraphs, this.bookmarks, mass_filexml[i], mass_filexml_links[i]);
        this.bookmarks = response.bookmarks;
        this.paragraphs = response.paragraphs;
      } catch (error) {
        console.error(`[Start] Ошибка при работе с файлом. ${error}`);
      }
    }

    this.paragraphs =  this.FixSpaceInTextParagraph(this.paragraphs);

    this.document_object['elements'][0]['elements'][0]['elements'] = this.paragraphs;
    const document = convert.js2xml(this.document_object);
    const linksDocument = convert.js2xml(this.hyperlinks);
    return { document, linksDocument };
  }

  /**
   * * Исправление поврежденных тэгов w:t после парсера
   * @param {[]} paragraphs
   * @returns {[]} paragraphs
   */
   FixSpaceInTextParagraph(paragraphs) {
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i]['name'] == 'w:p') {
        if (!this.ObjectHasKey(paragraphs[i], 'elements')) continue;
        const len_el = paragraphs[i]['elements'].length;

        for (let j = 0; j < len_el; j++) {
          if (paragraphs[i]['elements'][j]['name'] == 'w:r') {
            if (!this.ObjectHasKey(paragraphs[i]['elements'][j], 'elements')) continue;
            const len_wr_el = paragraphs[i]['elements'][j]['elements'].length;

            for (let k = 0; k < len_wr_el; k++) {
              if (paragraphs[i]['elements'][j]['elements'][k]['name'] == 'w:t') {
                if (!this.ObjectHasKey(paragraphs[i]['elements'][j]['elements'][k], 'elements')) {
                  paragraphs[i]['elements'][j]['elements'][k]['elements'] = [];
                  paragraphs[i]['elements'][j]['elements'][k]['elements'].push({
                    text: ' ',
                    type: 'text'
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
   * Загрузить главный документ
   * @param {string} filexml XML документа
   * @param {string} links XML ссылки документа
   * @returns {void}
   */
   load(filexml, links) {
    let parseXmlFile = null;
    let parseXmlFile_links = null;
    parseXmlFile =  convert.xml2js(filexml, {
      compact: false,
      spaces: 0,
      trim: false
    });

    parseXmlFile_links =  convert.xml2js(links, {
      compact: false,
      spaces: 0,
      trim: false
    });

    this.hyperlinks = parseXmlFile_links;
    this.document = filexml;
    this.document_object = parseXmlFile;
    this.paragraphs =  this.document_object['elements'][0]['elements'][0]['elements'];

    try {
      const response =  this.GetBookmarks(this.paragraphs);
      this.bookmarks = response.bookmarks;
      this.paragraphs = response.paragraphs;
    } catch (error) {
      console.error(`[Load] Ошибка! ${error}`);
    }

    if (this.CheckValidateParams()) return;
  }

  /**
   * Сохранить главный документ
   * * Данный метод заменяет параграфы в document_object на те что в paragraphs
   * @returns {void}
   */
   Save() {
    if (this.CheckValidateParams()) return;
    this.document_object['elements'][0]['elements'][0]['elements'] = this.paragraphs;
    this.DownLoad(this.document_object, 'document.xml');
  }

  /**
   * Генерирование уникального ИД ссылкам и добавление ссылок в общий массив ссылок (Main документа)
   * @param {number} start
   * @param {number} end
   * @param {{}[]} paragraphs
   * @param {{}[]} links
   * @returns {{}[]} paragraphs
   */
   ComputingLinks(start, end, paragraphs, links) {
    if (this.CheckValidateParams()) return;
    for (let i = start; i <= end; i++) {

      if (this.ObjectHasKey(paragraphs[i]['elements'], 'length') == false) continue;
      const _max_el = paragraphs[i]['elements'].length;
      if (_max_el < 1) continue;

      for (let j = 0; j < _max_el; j++) {
        const _name_el = paragraphs[i]['elements'][j]['name'];

        if (_name_el != 'w:hyperlink') continue;
        if (this.isNullOrUndefined(paragraphs[i]['elements'][j]['attributes'])) continue;
        if (this.ObjectHasKey(paragraphs[i]['elements'][j]['attributes'], 'r:id') === false) continue;

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
   * @param {string} mass_filexml_links
   * @returns {{bookmarks: {}[], paragraphs: {}[]}}
   */
   GetOperation(Paragraphs_main, Bookmarks_main, filexml, mass_filexml_links) {
    // ? #1 Избежать системных закладок и работать с закладками которые есть в обоих файлах не более
    // ? #2 Если количество параграфов совпадает
    // ? #3 Если в чайлд больше параграфов чем в мейн
    // ? #4 Если в чайлд меньше параграфов чем в мейн
    // !Исправить, после замены параграфов,текстов - заменить ID's на мейн

    if (this.CheckValidateParams()) return;

    let Object_filexml = null;
    let Object_filexml_links = null;
    let Bookmarks_filexml = Array();
    let Paragraphs_filexml = Array();

    Object_filexml =  convert.xml2js(filexml, {
      compact: false,
      spaces: 0,
      trim: false
    }); // Конвертируем XML в Array of Object

    Object_filexml_links =  convert.xml2js(mass_filexml_links, {
      compact: false,
      spaces: 0,
      trim: false

    }); // Конвертируем XML в Array of Object

    Paragraphs_filexml = Object_filexml['elements'][0]['elements'][0]['elements']; // Достаем парагрфавы ввиде массива объектов
    const response =  this.GetBookmarks(Paragraphs_filexml); // Получаем все закладки из данного документа
    Bookmarks_filexml = response.bookmarks;
    Paragraphs_filexml = response.paragraphs;
    console.log(Paragraphs_filexml)
    for (let i = 0; i < Bookmarks_filexml.length; i++) {

      // * ----------------[ #1 ]----------------------------
      const _name = Bookmarks_filexml[i].name;
      if (_name == "unknown") continue; // Это системные закладки
      const c = Bookmarks_main.findIndex(i => i.name == _name);
      if (c < 0) continue;
      const BKM_main = Bookmarks_main[c];
      Paragraphs_filexml =  this.ComputingLinks(Bookmarks_filexml[i].start, Bookmarks_filexml[i].end, Paragraphs_filexml, Object_filexml_links);

      // * ----------------[ #2 ]----------------------------
      if (Bookmarks_filexml[i].countParagraphs == BKM_main.countParagraphs) {
        // console.log('#2');
        console.log('1')
        for (let j = 0; j < BKM_main.countParagraphs; j++) {
          if (!(Paragraphs_main[BKM_main.start + j] && Paragraphs_filexml[Bookmarks_filexml[i].start + j])) continue;
          Paragraphs_main[BKM_main.start + j] =  this.ReplaceTextFromOtherParagraph(Paragraphs_main[BKM_main.start + j], Paragraphs_filexml[Bookmarks_filexml[i].start + j], true);
        }
      }

      else {
        console.log('2')

        // * ----------------[ #3 ]----------------------------
        if (Bookmarks_filexml[i].countParagraphs > BKM_main.countParagraphs) {
          console.log('2.1')

          Paragraphs_main[BKM_main.start] =  this.ReplaceTextFromOtherParagraph(Paragraphs_main[BKM_main.start], Paragraphs_filexml[Bookmarks_filexml[i].start], false);

          // ? Если местонахождение закладок с обоих файлах совпадает
          if (BKM_main.endInOtherPR == Bookmarks_filexml[i].endInOtherPR && BKM_main.endIsMinePR == Bookmarks_filexml[i].endIsMinePR) {
            // console.log('#3-1');
            console.log('2.1.1')
            const pcount = Bookmarks_filexml[i].countParagraphs - BKM_main.countParagraphs;

            const PR =  this.GetRangeParagraphs(Paragraphs_filexml, Bookmarks_filexml[i].start + 1, Bookmarks_filexml[i].end);
            for (let j = BKM_main.start + 1; j <= BKM_main.end; j++) {
              delete Paragraphs_main[j];
            }

            Paragraphs_main =  this.AddNewParagraphs(Paragraphs_main, PR, BKM_main.start, BKM_main.end);
            Bookmarks_main[c].end += pcount;
            Bookmarks_main[c].countParagraphs += pcount;

            for (let j = c + 1; j < Bookmarks_main.length; j++) {
              Bookmarks_main[j].start += pcount;
              Bookmarks_main[j].end += pcount;
            }
             this.DeleteBookMarksInLastPR_FIX(Paragraphs_main[Bookmarks_main[c].end]);
            // Фикс закладок
            Paragraphs_main[Bookmarks_main[c].end]['elements'].push({
              attributes: {
                "w:id": Bookmarks_main[c].id
              },
              name: 'w:bookmarkEnd',
              type: 'element'
            });

          }
          else {
            console.log('2.1.2')
            // console.log('#3-2');

            const pcount = Bookmarks_filexml[i].countParagraphs - BKM_main.countParagraphs;
            const PR =  this.GetRangeParagraphs(Paragraphs_filexml, Bookmarks_filexml[i].start + 1, Bookmarks_filexml[i].end);

            for (let j = BKM_main.start + 1; j <= BKM_main.end; j++) {
              delete Paragraphs_main[j];
            }

            Paragraphs_main =  this.AddNewParagraphs(Paragraphs_main, PR, BKM_main.start, BKM_main.end);

            Bookmarks_main[c].end += pcount;
            Bookmarks_main[c].countParagraphs += pcount;
            for (let j = c + 1; j < Bookmarks_main.length; j++) {
              Bookmarks_main[j].start += pcount;
              Bookmarks_main[j].end += pcount;
            }
             this.DeleteBookMarksInLastPR_FIX(Paragraphs_main[Bookmarks_main[c].end]);

            // Фикс закладок
            if (Bookmarks_main[c].endInOtherPR) {
              console.log('2.1.2.1')
              const _index =  Paragraphs_main[Bookmarks_main[c].end]['elements'].findIndex(i => i['name'] == 'w:bookmarkEnd');
              if (_index > -1) {
                Paragraphs_main[Bookmarks_main[c].end]['elements'][_index] = null;
                Paragraphs_main[Bookmarks_main[c].end]['elements'].splice(_index, 1);
              }
            }
            else {
              console.log('2.1.2.2')
              Paragraphs_main[Bookmarks_main[c].end]['elements'].push({
                attributes: {
                  "w:id": Bookmarks_main[c].id
                },
                name: 'w:bookmarkEnd',
                type: 'element'
              });
            }
          }
        }
        // * ----------------[ #4 ]----------------------------
        else {
          console.log('2.2')
          Paragraphs_main[BKM_main.start] =  this.ReplaceTextFromOtherParagraph(Paragraphs_main[BKM_main.start], Paragraphs_filexml[Bookmarks_filexml[i].start], false);
          // ? Если местонахождение закладок с обоих файлах совпадает

          if (BKM_main.endInOtherPR == Bookmarks_filexml[i].endInOtherPR && BKM_main.endIsMinePR == Bookmarks_filexml[i].endIsMinePR) {
            // console.log('#4-1');
            console.log('2.2.1')
            const pcount = Bookmarks_filexml[i].countParagraphs - BKM_main.countParagraphs;

            for (let j = BKM_main.start + 1; j <= BKM_main.end; j++) {
              Paragraphs_main.splice(BKM_main.start + 1, 1);
            }

            if (Bookmarks_filexml[i].countParagraphs > 1) {
              const PR =  this.GetRangeParagraphs(
                  Paragraphs_filexml,
                  Bookmarks_filexml[i].start + 1,
                  Bookmarks_filexml[i].end
              );
              Paragraphs_main =  this.AddNewParagraphs(
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
            Paragraphs_main[Bookmarks_main[c].end]['elements'].push({
              attributes: {
                "w:id": Bookmarks_main[c].id
              },
              name: 'w:bookmarkEnd',
              type: 'element'
            });
          }
          else {
            console.log('2.2.2')
            // console.log('#4-2');
            const pcount = Bookmarks_filexml[i].countParagraphs - BKM_main.countParagraphs;

            for (let j = BKM_main.start + 1; j <= BKM_main.end; j++) {
              Paragraphs_main.splice(BKM_main.start + 1, 1);
            }

            if (Bookmarks_filexml[i].countParagraphs > 1) {
              const PR =  this.GetRangeParagraphs(Paragraphs_filexml, Bookmarks_filexml[i].start + 1, Bookmarks_filexml[i].end);
              Paragraphs_main =  this.AddNewParagraphs(Paragraphs_main, PR, BKM_main.start, BKM_main.end);
            }

            Bookmarks_main[c].end += pcount;
            Bookmarks_main[c].countParagraphs += pcount;
            for (let j = c + 1; j < Bookmarks_main.length; j++) {
              Bookmarks_main[j].start += pcount;
              Bookmarks_main[j].end += pcount;
            }

            // Фикс закладок
            if (Bookmarks_main[c].endInOtherPR == true) {
              console.log('2.2.2.1')
              const _index =  Paragraphs_main[Bookmarks_main[c].end]['elements'].findIndex(i => i['name'] == 'w:bookmarkEnd');
              if (_index > -1) {
                Paragraphs_main[Bookmarks_main[c].end]['elements'][_index] = null;
                Paragraphs_main[Bookmarks_main[c].end]['elements'].splice(_index, 1);
              }
            }
            else {
              console.log('2.2.2.2')
              Paragraphs_main[Bookmarks_main[c].end]['elements'].push({
                attributes: {
                  "w:id": Bookmarks_main[c].id
                },
                name: 'w:bookmarkEnd',
                type: 'element'
              });
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
   * Есть ли свойство [key] в объекте [Object]
   * @param {{}} object
   * @param {string} key
   * @returns {boolean}
   */
  ObjectHasKey(object, key) {
    return object ? hasOwnProperty.call(object, key) : false;
  }

  /**
   *
   * @param {*} object
   */
  isNullOrUndefined(object) {
    if (object === null || object === undefined) return true;
    return false;
  }

  /**
   * Удалить глобальные закладки (гл. Документ)
   * @returns {void}
   */
   DeleteGlobalBookmarks(bookmarks, paragraphs) {
    if (paragraphs.findIndex(item => item.name == "w:bookmarkEnd") > -1) {
      for (let i = 0; i < bookmarks.length; i++) {
        if (bookmarks[i].endInOtherPR == false && bookmarks[i].endIsMinePR == false) {

          for (let j = bookmarks[i].end; j > 0; j--) {
            if (paragraphs[j]['name'] == 'w:p') {

              if (this.ObjectHasKey(paragraphs[j], 'elements')) {
                console.log(437598734856874365876345876348576438756347865873465)

                paragraphs[j]['elements'].push(paragraphs[bookmarks[i].end]);
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
        paragraphs: paragraphs,
        bookmarks: bookmarks
      }

    } else return {
      paragraphs: paragraphs,
      bookmarks: bookmarks
    }
  }

  /**
   * Удалить сломанные закладки
   * @param {[]} bookmarks
   * @returns {[]} bookmarks
   */
   RemoveBrokenBookMarks(bookmarks) {
    let temp_bookmarks = new Array();
    for (const bookmark of bookmarks) {
      if (!(isNaN(bookmark.end) || this.isNullOrUndefined(bookmark.end))) {
        temp_bookmarks.push(bookmark);
      }
    }
    return temp_bookmarks;
  }

  /**
   * Получить массив закладок из документа
   * @param {string} paragraphs
   * @returns {[]} Возвращает массив закладок из документа
   */
   GetBookmarks(paragraphs) {
    let massBookmarks = new Array();
    let bookMarkIsOpen = false;
    let i = -1;
    for (const paragraph of paragraphs) {
      i++;

      if (paragraph['name'] === 'w:p') {
        bookMarkIsOpen = false;

        for (const element_pr of paragraph['elements']) {
          if (element_pr['name'] == 'w:bookmarkStart') {
            let _name = element_pr['attributes']['w:name'];
            if (_name == "_GoBack") _name = "unknown";
            bookMarkIsOpen = true;
            const _id = element_pr['attributes']['w:id'];
            massBookmarks.push({
              start: i,
              name: _name,
              id: parseInt(_id),
            });

          }
          else if (element_pr['name'] == 'w:bookmarkEnd') {
            const _id = element_pr['attributes']['w:id'];
            const _index = massBookmarks.findIndex(item => item.id == _id);
            if (_index > -1) {
              massBookmarks[_index].end = i;
              massBookmarks[_index].endInOtherPR = (bookMarkIsOpen && (massBookmarks[_index].end != massBookmarks[_index].start));
              massBookmarks[_index].endIsMinePR = (massBookmarks[_index].end == massBookmarks[_index].start) || (bookMarkIsOpen == false);
            }
          }
        }
      }
      //------------------------------------------------
      if (paragraph['name'] == 'w:bookmarkStart') {
        const _name = paragraph['attributes']['w:name'];
        throw `[GetBookmarks] Закладка вне параграфов. Name: ${_name} ID: ${_id}`;
      }
      else if (paragraph['name'] == 'w:bookmarkEnd') {
        const _id = paragraph['attributes']['w:id'];
        const _index = massBookmarks.findIndex(item => item.id == _id);
        if (_index > -1) {
          massBookmarks[_index].end = i;
          massBookmarks[_index].endInOtherPR = false;
          massBookmarks[_index].endIsMinePR = false;
        }
      }
    }

    massBookmarks =  this.RemoveBrokenBookMarks(massBookmarks);
    //Фикс закладок, удаляем глобальные закладки
    const response =  this.DeleteGlobalBookmarks(massBookmarks, paragraphs);
    massBookmarks = response.bookmarks;
    paragraphs = response.paragraphs;

    for (let i = 0; i < massBookmarks.length; i++) {
      if (massBookmarks[i].endInOtherPR) {
        massBookmarks[i].end -= 1;
      }
    }

    for (let i = 0; i < massBookmarks.length; i++) {
      const temp_Num = (massBookmarks[i].end - massBookmarks[i].start) + 1;
      massBookmarks[i].countParagraphs = (temp_Num <= 0 ? 1 : temp_Num);
    }

    return {
      paragraphs: paragraphs,
      bookmarks: massBookmarks
    };
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
   * @
   * @param {{}[]} paragraphs
   * @param {number} start
   * @param {number} end
   */
   GetRangeParagraphs(paragraphs, start, end) {
    return paragraphs.slice(start, end + 1);
  }

  // /**
  //  * Скачать главный документ (document.xml, document.xml.rels)
  //  * @param {{}} document_object
  //  * @param {string} filename сохранить как
  //  * @example DownLoad(document_object,'document.xml');
  //  * @returns {void}
  //  */
  // DownLoad(document_object, filename) {
  //   if (this.CheckValidateParams()) return;
  //   if (filename == "" || filename == 'undefined') {
  //     console.error('[DownLoad] Ошибка! filename == "" || null');
  //     return;
  //   }
  //   var xml = convert.js2xml(document_object);
  //   var blob = new Blob([xml], {
  //     type: "application/xml"
  //   });
  //   FileSaver.saveAs(blob, filename);
  //
  //   var xml_links = convert.js2xml(this.hyperlinks);
  //   var blob_links = new Blob([xml_links], {
  //     type: "application/xml"
  //   });
  //   FileSaver.saveAs(blob_links, 'document.xml.rels');
  // }

  /**
   * Вставить параграфы в paragraphs от start до end из newParagraphs
   * @
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
   * @
   * @param {{}} paragraph
   * @param {{}} otheParagraph
   * @returns {{}} Возвращает paragraph
   * !Надо исправить
   */
   ReplaceTextFromOtherParagraph(paragraph, otheParagraph, check) {
    if (this.ObjectHasKey(paragraph['elements'], 'length') == false) return paragraph;
    if (this.ObjectHasKey(otheParagraph['elements'], 'length') == false) return paragraph;
    let _Buffer = [];
    const _len1 = paragraph['elements'].length;
    const _len2 = otheParagraph['elements'].length;

    for (let i = 0; i < _len1; i++) {
      const _name = paragraph['elements'][i]['name'];
      if (!(_name == 'w:bookmarkEnd' || _name == 'w:bookmarkStart' || _name == 'w:pPr')) break;
      else {
        if (_name == 'w:pPr') {
          const _ind =  otheParagraph['elements'].findIndex(i => i['name'] == 'w:pPr');
          if (_ind > -1) _Buffer.push(otheParagraph['elements'][_ind]);
          else _Buffer.push(paragraph['elements'][i]);
        } else _Buffer.push(paragraph['elements'][i]);
      }
    }

    for (let i = 0; i < _len2; i++) {
      const _name = otheParagraph['elements'][i]['name'];
      if ((_name == 'w:bookmarkEnd' || _name == 'w:bookmarkStart' || _name == 'w:pPr')) continue;
      else _Buffer.push(otheParagraph['elements'][i]);
    }

    for (let i = _len1 - 1; i > 0; i--) {
      const _name = paragraph['elements'][i]['name'];

      if (_name == 'w:bookmarkEnd') {

        let _id = -1;
        let _ind = -1;

        try {
          _id = paragraph['elements'][i]['attributes']['w:id'];
        } catch (error) {
          console.error(`[ReplaceTextFromOtherParagraph | id] ${error}`);
          _id = -1;
        }

        try {
          _ind = _Buffer.findIndex(i => (this.isNullOrUndefined(i['attributes']['w:id']) ? '' : i['attributes']['w:id']) == _id);
        } catch (error) {
          _ind = -2;
        }

        if (_ind == -1 || check) _Buffer.push(paragraph['elements'][i]);
      } else break;
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
    let temp_elements = [];
    for (const element of paragraph['elements']) {
      if (element['name'] == 'w:bookmarkEnd' || element['name'] == 'w:bookmarkStart' || element['name'] == 'w:pPr') {
        temp_elements.push(element);
      }
    }
    paragraph['elements'] = temp_elements;
    return paragraph;
  }

   DeleteBookMarksInLastPR_FIX(paragraph) {
    let temp_elements = [];
    for (const element of paragraph['elements']) {
      if (element['name'] != 'w:bookmarkEnd') {
        temp_elements.push(element);
      }
    }
    paragraph['elements'] = temp_elements;
    return paragraph;
  }
}
