import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { Bookmark } from './entities/bookmark.entity';
import { Document } from '../document/entities/document.entity';

@Injectable()
export class BookmarkService {
    constructor(
        @Inject('BookmarkRepository') private readonly bookmarkRepository: typeof Bookmark,
    ) {}

    async getBookmarks(userId: number, page?: number, pageSize?: number) {
        page = page > 0 ? page : PAGE;
        pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
        const offset: number = pageSize * page;
        const result = await this.bookmarkRepository.findAndCountAll(
          {
            limit: pageSize,
            offset,
            include: [{model: Document, as: 'document'}],
            where: { userId },
          });

        return new EntitiesWithPaging(result.rows, result.count, page, pageSize);
    }

    async addBookmark(userId: number, docId: number, control?: boolean) {
        return this.bookmarkRepository.create({userId, docId, control});
    }

    async putBookmark(userId: number, docId: number, control: boolean) {
        return this.bookmarkRepository.update({ control }, {where: {userId, docId}});
    }

    async deleteBookmark(userId: number, docId: number) {
        return this.bookmarkRepository.destroy({where: {userId, docId}});
    }
}
