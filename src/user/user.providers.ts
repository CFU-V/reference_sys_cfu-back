import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';

export const userProviders = [
    {
        provide: 'RoleRepository',
        useValue: Role,
    },
    {
        provide: 'UserRepository',
        useValue: User,
    }
];
