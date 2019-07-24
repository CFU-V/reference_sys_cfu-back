import { Bookmark } from './entities/bookmark.entity';

export const bookmarkProviders = [
    {
        provide: 'BookmarkRepository',
        useValue: Bookmark,
    },
];
