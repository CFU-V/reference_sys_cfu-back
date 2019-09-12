import { BookmarkDto } from '../../bookmarks/dto/bookmark.dto';

export class GetDocumentDto {
    fileName: string;
    info: string;
    bookmarks?: [BookmarkDto];
}
