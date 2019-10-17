import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { messageProviders } from './message.providers';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [MessageController],
    providers: [
        MessageService,
        ...messageProviders,
    ],
})

export class MessageModule {}
