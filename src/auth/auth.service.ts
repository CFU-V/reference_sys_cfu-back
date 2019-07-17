import { Injectable } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { PayloadDTO } from './dto/payload.dto';

@Injectable()
export class AuthService {
  constructor(private userService: UserService) {}

  async signPayload(payload: PayloadDTO) {
    return sign(payload, process.env.SECRET_KEY, { expiresIn: process.env.EXPIRES_TOKEN_TIME });
  }

  async validateUser(payload: PayloadDTO, additionalRole?: string) {
    return await this.userService.findByPayload(payload, additionalRole);
  }
}
