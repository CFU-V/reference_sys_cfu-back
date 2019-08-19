import { Injectable } from "@nestjs/common";
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LiteAuthGuard extends AuthGuard('lite') {

    handleRequest(err, user, info) {
        return user;
    }

}
