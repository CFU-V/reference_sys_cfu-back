import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminStrategy } from './strategies/admin.strategy';
import { StaffStrategy } from './strategies/staff.strategy';
import { UserService } from '../user/user.service';
import { userProviders } from '../user/user.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [UserService, AuthService, JwtStrategy, AdminStrategy, StaffStrategy, ...userProviders],
})
export class AuthModule {}
