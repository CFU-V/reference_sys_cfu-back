import {Inject, Injectable, OnModuleInit} from '@nestjs/common';
import { Message } from './entities/message.entity';
import { MessageDto } from './dto/message.dto';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { UserMessage } from './entities/message.users.entity';
import { User } from '../user/entities/user.entity';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Transport, Client, ClientRedis } from '@nestjs/microservices';
import { RedisClient } from "@nestjs/microservices/external/redis.interface";
import { Subject } from "rxjs";

@WebSocketGateway()
@Injectable()
export class MessageService implements OnModuleInit {
    @Client({
        transport: Transport.REDIS,
        options: {
            url: 'redis://localhost:6379',
        }
    })
    private redis: ClientRedis;
    private redisClient: RedisClient;

    async onModuleInit() {
        await this.redis.connect();
        const sub = new Subject<Error>();
        sub.subscribe({
            error: (error) => console.log(`[REDIS]: ${error}`)
        });
        this.redisClient = this.redis.createClient(sub);
    }

    @WebSocketServer()
    socketServer: Server;
    constructor(
        @Inject('MessageRepository') private readonly messageRepository: typeof Message,
        @Inject('UserMessageRepository') private readonly userMessageRepository: typeof UserMessage,
        @Inject('UserRepository') private readonly userRepository: typeof User,
    ) {}

    @SubscribeMessage('identity')
    async identity(client: Socket, userId: number) {
        try {
            await this.redisClient.set(userId, client.id);
            return { success: true };
        } catch (error) {
            return { error };
        }
    }

    async send(message: MessageDto): Promise<void> {
        let transaction;
        try {
            transaction = await this.messageRepository.sequelize.transaction();
            const sentMessage = await this.messageRepository.create(message, { transaction });
            await sentMessage.addRecipient(message.recipients, { transaction });
            transaction.commit();
            for (const recipientId of message.recipients) {
                this.redisClient.get(recipientId, async (err, socketId) => {
                    console.log(socketId);
                    const author = await this.userRepository.findOne({ where: { id: message.authorId }});
                    this.socketServer.sockets.connected[socketId].emit('message', {
                        author: `${author.firstName} ${author.lastName}`,
                        message: message.text,
                    })
                })
            }
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
