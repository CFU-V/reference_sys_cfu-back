/*
    Authentication.
 */
export const SYSTEM_USER_ID: number = 1;
export const ADMIN_ROLE: string = 'admin';
export const MANAGER_ROLE: string = 'manager';
export const COMMON_ROLE: string = 'common';

/*
    Documents parsing.
 */
export const DOCX_XML_PATH: string = 'word/document.xml';
export const RELS_XML_PATH: string = 'word/_rels/document.xml.rels';
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
