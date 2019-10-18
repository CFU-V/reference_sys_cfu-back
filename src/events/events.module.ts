import { Module } from '@nestjs/common';
import { EventsGateway } from './events.geteway';

@Module({
    providers: [EventsGateway],
})
export class EventsModule {}
