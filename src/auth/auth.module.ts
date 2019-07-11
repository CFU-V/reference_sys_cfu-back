import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AdminStrategy } from './admin.strategy';
import { UserService } from '../user/user.service';
import { userProviders } from '../user/user.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [UserService, AuthService, JwtStrategy, AdminStrategy, ...userProviders],
})
export class AuthModule {}
