import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { PayloadDTO } from '../auth/dto/payload.dto';
import { LoginDTO } from '../auth/dto/login.dto';
import { Role } from './entities/role.entity';
import { RegistrationDTO } from '../auth/dto/registration.dto';

@Injectable()
export class UserService {
    constructor(
        @Inject('UserRepository') private readonly userRepository: typeof User,
    ) {}

    async findByLogin(userDTO: LoginDTO) {
        const { login, password } = userDTO;
        const user = await this.userRepository
          .findOne({ where: { login }, include: [{ model: Role, as: 'role'}] });
        if (!user) {
            throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
        }

        if (await bcrypt.compare(password, user.password)) {
            return this.sanitizeUser(user);
        } else {
            throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
        }
    }

    async findByPayload(payload: PayloadDTO) {
        return await this.userRepository.findOne({
            where: {
                login: payload.login,
            },
            include: [{ model: Role, as: 'role', where: { name: payload.role } }],
        });
    }

    async registration(payload: RegistrationDTO) {
        const newUser = await this.userRepository.create(payload);
        newUser.role = await newUser.getRole();
        return this.sanitizeUser(newUser);
    }

    sanitizeUser(user: User) {
        return {
            id: user.id,
            login: user.login,
            lastName: user.lastName,
            firstName: user.firstName,
            surName: user.surName,
            phone: user.phone,
            email: user.email,
            position: user.position,
            birthDate: user.birthDate,
            role: user.role.name,
        };
    }
}
