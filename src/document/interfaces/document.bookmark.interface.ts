export interface IDocumentBookmark {
    start: number;
    name: string;
    id: number;
    paragraphIsOpen: boolean;
    end?: number;
    endInOtherPR?: boolean;
    endIsMinePR?: boolean;
    countParagraphs?: number;
}
