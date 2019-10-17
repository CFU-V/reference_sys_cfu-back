import { Bookmark } from './entities/bookmark.entity';
import { Message } from '../messages/entities/message.entity';

export const bookmarkProviders = [
    {
        provide: 'BookmarkRepository',
        useValue: Bookmark,
    },
    {
        provide: 'MessageRepository',
        useValue: Message,
    },
];
