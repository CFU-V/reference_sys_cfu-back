import { Document } from './entities/document.entity';
import { User } from '../user/entities/user.entity';
import { Role } from '../user/entities/role.entity';
import { Bookmark } from '../bookmarks/entities/bookmark.entity';
import {Category} from "./entities/category.entity";

export const documentProviders = [
    {
        provide: 'DocumentRepository',
        useValue: Document,
    },
    {
        provide: 'UserRepository',
        useValue: User,
    },
    {
        provide: 'RoleRepository',
        useValue: Role,
    },
    {
        provide: 'BookmarkRepository',
        useValue: Bookmark,
    },
    {
        provide: 'CategoryRepository',
        useValue: Category,
    },
];
