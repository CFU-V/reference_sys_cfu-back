import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import {Server, Socket} from 'socket.io';

@WebSocketGateway()
export class EventsGateway {
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('identity')
    async identity(client: Socket, data: number): Promise<number> {
        return data;
    }
}
