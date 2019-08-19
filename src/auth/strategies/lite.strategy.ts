import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';

import { AuthService } from '../auth.service';
import { PayloadDTO } from '../dto/payload.dto';
import { ADMIN_ROLE, MANAGER_ROLE, COMMON_ROLE } from "../../common/constants";

@Injectable()
export class LiteStrategy extends PassportStrategy(Strategy, 'lite') {
    constructor(private authService: AuthService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.SECRET_KEY,
        });
    }

    async validate(payload: any) {
        return await this.authService.validateUser(payload, [ADMIN_ROLE, MANAGER_ROLE, COMMON_ROLE]);
    }
}
