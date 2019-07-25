import { Document } from './entities/document.entity';
import { User } from '../user/entities/user.entity';

export const documentProviders = [
    {
        provide: 'DocumentRepository',
        useValue: Document,
    },
    {
        provide: 'UserRepository',
        useValue: User,
    },
];
