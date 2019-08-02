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
export const BOOKMARK_TEXT_SELECTOR: string = 'w\\\:t';
export const BOOKMARK_NAME_SELECTOR: string = 'w:name';
export const BOOKMARK_NAME_PATTERN: RegExp = /^Замена[0-9]{1,}$/;
export const DOCX_XML_PATH: string = 'word/document.xml';
export const DOCX_TPM_FOLDER_PATH: string = 'tmp';

/*
    Logging.
 */
export const ADD_BOOKMARK: string = 'ADD_BOOKMARK';
