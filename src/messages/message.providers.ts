import { Message } from '../messages/entities/message.entity';
import { UserMessage } from './entities/message.users.entity';
import { User } from '../user/entities/user.entity';

export const messageProviders = [
    {
        provide: 'MessageRepository',
        useValue: Message,
    },
    {
        provide: 'UserMessageRepository',
        useValue: UserMessage,
    },
    {
        provide: 'UserRepository',
        useValue: User,
    },
];
