import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { PayloadDTO } from '../auth/dto/payload.dto';
import { LoginDTO } from '../auth/dto/login.dto';
import { Role } from './entities/role.entity';
import { RegistrationDTO } from '../auth/dto/registration.dto';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { Op } from 'sequelize';
import { UserDto } from './dto/user.dto';
import { MeDto } from './dto/me.dto';
import * as Fuse from 'fuse.js';

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

    async verifyByToken(token: string) {
        if (token) {
            try {
                return await verify(token.replace('Bearer ', ''), process.env.SECRET_KEY);
            } catch (error) {
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    async findByPayload(payload: PayloadDTO, additionalRoles?: Array<string>) {
        const or = [{name: payload.role }];

        for (const addRole of additionalRoles) {
            or.push({name: addRole})
        }

        const roleWhere = { [Op.or]: or };

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

    async comparePassword(id: number, password: string) {
        const user = await this.userRepository
            .findOne({ where: { id } });

        if (await bcrypt.compare(password, user.password)) {
            return true;
        } else {
            throw new HttpException('Invalid old password', HttpStatus.BAD_REQUEST);
        }
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

    async findUsers(s: string, page?: number, pageSize?: number) {
        try {
            page = page > 0 ? page : PAGE;
            pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
            const offset: number = pageSize * page;
            const options = {
                limit: pageSize,
                offset,
                include: [{model: Role, as: 'role'}],
            };

            const find = await this.userRepository.findAndCountAll(options);
            for (const [i, user] of find.rows.entries()) {
                find.rows[i] = await this.sanitizeUser(user);
            }
            const fuseOptions: Fuse.FuseOptions<UserDto> = {
                keys: ['lastName', 'firstName', 'surName'],
            };
            const fuse = new Fuse(find.rows, fuseOptions);
            const result = fuse.search(s);

            return new EntitiesWithPaging(result, find.count, page, pageSize);
        } catch (error) {
            console.log(error);
            return error;
        }
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
