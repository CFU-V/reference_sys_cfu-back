import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { Bookmark } from './entities/bookmark.entity';
import { Document } from '../document/entities/document.entity';
import { Message } from '../messages/entities/message.entity';
import { BookmarkNotification } from './bookmark.notification';
import { SYSTEM_USER_LOGIN } from '../common/constants';
import { User } from '../user/entities/user.entity';

@Injectable()
export class BookmarkService {
    constructor(
        @Inject('MessageRepository') private readonly messageRepository: typeof Message,
        @Inject('BookmarkRepository') private readonly bookmarkRepository: typeof Bookmark,
        @Inject('UserRepository') private readonly userRepository: typeof User,
    ) {}

    async getBookmarks(userId: number, page?: number, pageSize?: number): Promise<EntitiesWithPaging>{
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

    async addBookmark(userId: number, docId: number, control?: boolean): Promise<Bookmark> {
        return await this.bookmarkRepository.create({userId, docId, control});
    }

    async putBookmark(userId: number, docId: number, control: boolean): Promise<Bookmark> {
        return await this.bookmarkRepository.update({ control }, {where: {userId, docId}});
    }

    async notify(notification: BookmarkNotification, document: Document): Promise<void> {
        let transaction;
        try {
            transaction = await this.messageRepository.sequelize.transaction();
            const bookmarks = await this.bookmarkRepository.findAll({
                where: { docId: document.id, control: true },
                attributes: ['userId'],
                raw: true,
            });
            const system = await this.userRepository.findOne({ where: { login: SYSTEM_USER_LOGIN} });
            if (bookmarks.length > 0 && system) {
                const users = bookmarks.map((bookmark) => parseInt(bookmark.userId, 10));
                const sentMessage = await this.messageRepository.create(
                    {
                        text: `Документ: ${document.title} - ${notification}`,
                        authorId: system.id,
                    },
                    { transaction },
                );
                await sentMessage.addRecipient(users, { transaction });
                transaction.commit();
            }
        } catch (error) {
            transaction.rollback();
            console.log(error);
        }
    }

    async deleteBookmark(userId: number, docId: number) {
        return this.bookmarkRepository.destroy({where: {userId, docId}});
    }
}
