import { Body, Controller, Post, Res, HttpStatus } from '@nestjs/common';
import { ApiUseTags } from '@nestjs/swagger';
import { UserService } from '../user/user.service';
import { PayloadDTO } from './dto/payload.dto';
import { LoginDTO } from './dto/login.dto';
import { AuthService } from './auth.service';
import { RegistrationDTO } from './dto/registration.dto';

@ApiUseTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  @Post('login')
  async login(
    @Res() res,
    @Body() loginPayload: LoginDTO,
  ) {
    const user = await this.userService.findByLogin(loginPayload);
    const payload: PayloadDTO = {
      login: user.login,
      role: user.role,
    };
    const token = await this.authService.signPayload(payload);
    res.status(HttpStatus.OK).json({ user, token });
  }

  @Post('registration')
  async registration(
    @Res() res,
    @Body() registrationPayload: RegistrationDTO,
  ) {
    try {
      const user = await this.userService.registration(registrationPayload);

      res.status(HttpStatus.OK).json(user);
    } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
    }
  }
}
