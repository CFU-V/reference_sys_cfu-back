export class DocumentTreeDto {
    id: number;
    link: string;
    info: string;
    parentId: number;
    old_version: number;
    level: number;
    date: Date;
    categoryTitle: string;
    number: number;
    childrens: Array<DocumentTreeDto>;
}

export class DocumentRecursiveDto {
    id: number;
    link: string;
    parentId: number;
    old_version: number;
    info: string;
    level: number;
    date: Date;
    categoryTitle: string;
    number: number;
}
