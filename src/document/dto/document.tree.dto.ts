export class DocumentTreeDto {
    id: number;
    link: string;
    info: string;
    parentId: number;
    old_version: number;
    level: number;
    childrens: Array<DocumentTreeDto>;
}

export class DocumentRecursiveDto {
    id: number;
    link: string;
    parentId: number;
    old_version: number;
    info: string;
    level: number;
}
