import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { PayloadDTO } from '../auth/dto/payload.dto';
import { LoginDTO } from '../auth/dto/login.dto';
import { Role } from './entities/role.entity';
import { RegistrationDTO } from '../auth/dto/registration.dto';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { UserDto } from './dto/user.dto';
import { MeDto } from './dto/me.dto';
import { Op } from 'sequelize';

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

    async findByPayload(payload: PayloadDTO, additionalRole?: string) {
        let roleWhere = {};

        if (additionalRole) {
            roleWhere = {
                [Op.or]: [
                    {name: payload.role },
                    {name: additionalRole},
                ],
            };
        } else {
            roleWhere = { name: payload.role };
        }

        return await this.userRepository.findOne({
            where: {
                login: payload.login,
            },
            include: [{
                model: Role, as: 'role',
                where: roleWhere,
            }],
        });
    }

    async registration(payload: RegistrationDTO) {
        const newUser = await this.userRepository.create(payload);
        newUser.role = await newUser.getRole();
        return this.sanitizeUser(newUser);
    }

    async getUsers(id: number, page?: number, pageSize?: number) {
        page = page > 0 ? page : PAGE;
        pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
        const offset: number = pageSize * page;
        const options = {
            limit: pageSize,
            offset,
            include: [{model: Role, as: 'role'}],
            where: Number(id) !== 0 ? { id } : {},
        };

        const result = await this.userRepository.findAndCountAll(options);
        for (const [i, user] of result.rows.entries()) {
            result.rows[i] = await this.sanitizeUser(user);
        }
        return new EntitiesWithPaging(result.rows, result.count, page, pageSize);
    }

    async putUser(user: UserDto) {
        const oldUser = await this.userRepository.findOne({ where: { id: user.id } });
        await oldUser.update(user);
        return await this.sanitizeUser(await this.userRepository.findOne({
            where: { id: user.id },
            include: [{model: Role, as: 'role'}],
        }));
    }

    async putMe(id: number, user: MeDto) {
        const oldUser = await this.userRepository.findOne({ where: { id } });
        await oldUser.update(user);
        return this.sanitizeUser(await this.userRepository.findOne({
            where: { id },
            include: [{model: Role, as: 'role'}],
        }));
    }

    async deleteUser(userId: number) {
        return await this.userRepository.destroy({where: {id: userId}});
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
