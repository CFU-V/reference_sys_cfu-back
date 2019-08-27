import { Document } from './entities/document.entity';
import { User } from '../user/entities/user.entity';
import { Role } from '../user/entities/role.entity';

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
];
