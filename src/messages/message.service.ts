import { Inject, Injectable } from "@nestjs/common";
import { Message } from "./entities/message.entity";
import { MessageDto } from "./dto/message.dto";

@Injectable()
export class MessageService {
    constructor(
        @Inject('MessageRepository') private readonly messageRepository: typeof Message,
    ) {}

    async send(message: MessageDto): Promise<void> {
        try {
            await this.messageRepository.create(message);
        } catch (error) {
            throw error;
        }
    };
}
