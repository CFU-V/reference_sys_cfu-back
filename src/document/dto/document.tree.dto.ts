export class DocumentTreeDto {
    id: number;
    link: string;
    parentId: number;
    level: number;
    childrens: Array<DocumentTreeDto>;
}

export class DocumentRecursiveDto {
    id: number;
    link: string;
    parentId: number;
    level: number;
}
