import { Inject, Injectable } from '@nestjs/common';
import { Message } from './entities/message.entity';
import { MessageDto } from './dto/message.dto';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { UserMessage } from './entities/message.users.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class MessageService {
    constructor(
        @Inject('MessageRepository') private readonly messageRepository: typeof Message,
        @Inject('UserMessageRepository') private readonly userMessageRepository: typeof UserMessage,
        @Inject('UserRepository') private readonly userRepository: typeof User,
    ) {}

    async send(message: MessageDto): Promise<void> {
        let transaction;
        try {
            transaction = await this.messageRepository.sequelize.transaction();
            const sentMessage = await this.messageRepository.create(message, { transaction });
            await sentMessage.addRecipient(message.recipients, { transaction });
            transaction.commit();
        } catch (error) {
            transaction.rollback();
            console.log(error);
            throw error;
        }
    }

    async read(recipientId: number, messageId: number): Promise<void> {
        try {
            await this.userMessageRepository.update(
                { isRead: true },
                { where: { recipientId, messageId },
                });
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async getMessages(userId: number, page?: number, pageSize?: number): Promise<EntitiesWithPaging> {
        try {
            page = page > 0 ? page : PAGE;
            pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
            const offset: number = pageSize * page;
            const result = await this.userMessageRepository.findAndCountAll(
                {
                    limit: pageSize,
                    offset,
                    include: [
                        {
                            model: Message,
                            as: 'message',
                            include: [
                                { model: User, as: 'author', attributes: ['firstName', 'lastName', 'surName'] },
                            ],
                        },
                    ],
                    where: { recipientId: userId },
                    attributes: ['recipientId', 'isRead'],
                });

            return new EntitiesWithPaging(result.rows, result.count, page, pageSize);
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async deleteMessage(userId: number, messageId: number): Promise<void> {
        try {
            const user = await this.userRepository.findOne({ where: { id: userId } });
            await user.removeMessage(messageId);
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
