/*
    Authentication.
 */
export const ADMIN_ROLE: string = 'admin';
export const MANAGER_ROLE: string = 'manager';
export const COMMON_ROLE: string = 'common';

/*
    Documents parsing.
 */
export const BOOKMARK_R_SELECTOR: string = 'w:r';
export const BOOKMARK_SELECTOR: string = 'w\\\:bookmarkStart';
export const BOOKMARK_R_SELECTOR_TEXT: string = 'w:r';
export const BOOKMARK_START_SELECTOR: string = 'w\\\:bookmarkStart';
export const BOOKMARK_START_SELECTOR_TEXT: string = 'w:bookmarkStart';
export const BOOKMARK_END_SELECTOR: string = 'w\\\:bookmarkEnd';
export const BOOKMARK_END_SELECTOR_TEXT: string = 'w:bookmarkEnd';
export const BOOKMARK_TEXT_SELECTOR: string = 'w\\\:t';
export const BOOKMARK_NAME_SELECTOR_TEXT: string = 'w:name';
export const BOOKMARK_NAME_SELECTOR: string = 'w\\:name';
export const BOOKMARK_ID_SELECTOR_TEXT: string = 'w:id';
export const BOOKMARK_ID_SELECTOR: string = 'w\\:id';
export const BOOKMARK_NAME_PATTERN: RegExp = /^Замена[0-9]{1,}$/;
export const DOCX_XML_PATH: string = 'word/document.xml';
export const CORE_XML_PATH: string = 'docProps/core.xml';
export const DOCX_TPM_FOLDER_PATH: string = 'tmp';
export const PROPERTY_FIELDS: object = {
    'dc\\:title': 'title',
    'dc\\:subject': 'subject',
    'dc\\:creator': 'creator',
    'cp\\:keywords': 'keywords',
    'cp\\:lastModifiedBy': 'lastModifiedBy',
    'cp\\:revision': 'revision',
    'dcterms\\:created': 'createdAt',
    'dcterms\\:modified': 'updatedAt',
};

/*
    Logging.
 */
export const BOOKMARK = {
    ADD: 'ADD_BOOKMARK',
    UPD: 'UPDATE_BOOKMARK',
    DEL: 'DELETE_BOOKMARK',
};
export const LOG_FILENAME_PATTERN: RegExp = /^logs-[0-9]{4}-[0-9]{2}-[0-9]{2}.log$/;
/*
    Search.
 */
export const DOCUMENT_INDEX: string = 'documents';
export const ALL_INDEX: string = '_all';
export const TOKENIZE_REGEXP: RegExp = /[a-zА-Я0-9]/gi;
/*
    Mail service.
 */
export const SHARING_METHOD = 'sharing';
export const GMAIL_SERVICE = 'gmail';
export const OAUTH2_TYPE = 'OAuth2';

/*
    ContentTypes
 */
export const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
