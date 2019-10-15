export interface IDocumentBookmark {
    start: number;
    name: string | number;
    id: number;
    paragraphIsOpen?: boolean;
    end?: number;
    endInOtherPR?: boolean;
    endIsMinePR?: boolean;
    countParagraphs?: number;
}
