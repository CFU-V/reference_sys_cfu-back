import { Bookmark } from './entities/bookmark.entity';
import { Message } from '../messages/entities/message.entity';
import { User } from '../user/entities/user.entity';

export const bookmarkProviders = [
    {
        provide: 'BookmarkRepository',
        useValue: Bookmark,
    },
    {
        provide: 'MessageRepository',
        useValue: Message,
    },
    {
        provide: 'UserRepository',
        useValue: User,
    },
];
