import { Message } from '../messages/entities/message.entity';

export const messageProviders = [
    {
        provide: 'MessageRepository',
        useValue: Message,
    },
];
