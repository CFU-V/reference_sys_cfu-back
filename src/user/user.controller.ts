import { Controller, Get, Res, HttpStatus, Param, NotFoundException, Post, Body, Query, Put, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiUseTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { UserDto } from './dto/user.dto';

@ApiUseTags('user')
@Controller('user')
export class UserController {
    constructor(private service: UserService) {}
}
