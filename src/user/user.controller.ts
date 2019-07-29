import {
    Controller,
    Get,
    Res,
    HttpStatus,
    Param,
    Post,
    Body,
    Query,
    Put,
    Delete,
    Request,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiUseTags, ApiBearerAuth, ApiResponse, ApiImplicitQuery, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ValidateObjectId } from '../shared/pipes/validate-object-id.pipes';
import { GetUsersResponseDto } from './dto/get-users-response.dto';
import { UserDto } from './dto/user.dto';
import { MeDto } from './dto/me.dto';
import { ValidateMeDtoPipes } from '../shared/pipes/validate-me-dto.pipes';
import { CredentialDto } from './dto/credential.dto';

@ApiUseTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
    constructor(private service: UserService) {}

    @UseGuards(AuthGuard('admin'))
    @Get('/')
    @ApiResponse({ status: 200, description: 'User info or array of users.', type: GetUsersResponseDto })
    @ApiOperation({title: 'Get users info.', description: 'Set id param 0, for getting all users'})
    @ApiImplicitQuery({
        name: 'page',
        description: 'The number of pages',
        required: false,
        type: Number,
    })
    @ApiImplicitQuery({
        name: 'pageSize',
        description: 'The number of users in page',
        required: false,
        type: Number,
    })
    async getAllUsers(
      @Res() res,
      @Query('id', new ValidateObjectId()) id: number,
      @Query('page') page: number,
      @Query('pageSize') pageSize: number,
    ) {
        try {
            return res.status(HttpStatus.OK).json(await this.service.getUsers(id, page, pageSize));
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json(error);
        }
    }

    @Post('/comparePassword')
    @UseGuards(AuthGuard('jwt'))
    @ApiResponse({ status: 200, description: 'Compare current password.'})
    @ApiOperation({title: 'Compare user password. Only for current user.'})
    async comparePassword(
        @Res() res,
        @Request() req,
        @Body() credential: CredentialDto,
    ) {
        try {
            return res.status(HttpStatus.OK).json({success: await this.service.comparePassword(req.user.id, credential.password)});
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json(error);
        }
    }

    @UseGuards(AuthGuard('admin'))
    @ApiResponse({ status: 200, description: 'User deleted'})
    @ApiOperation({title: 'Delete user.'})
    @ApiImplicitQuery({
        name: 'userId',
        description: 'User id to be deleted.',
        required: true,
        type: Number,
    })
    @Delete('/')
    async deleteUser(
      @Res() res,
      @Query('userId', new ValidateObjectId()) userId: number,
    ) {
        try {
            return res.status(HttpStatus.OK).json(await this.service.deleteUser(userId));
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json(error);
        }
    }

    @Put('/')
    @UseGuards(AuthGuard('admin'))
    @ApiResponse({ status: 200, description: 'Updated user.'})
    @ApiOperation({title: 'Update user. Only for admin.'})
    async putUser(
      @Res() res,
      @Body() user: UserDto,
    ) {
        try {
            return res.status(HttpStatus.OK).json(await this.service.putUser(user));
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json(error);
        }
    }

    @Put('/me')
    @UseGuards(AuthGuard('jwt'))
    @ApiResponse({ status: 200, description: 'Updated current user.'})
    @ApiOperation({title: 'Update user. Only for current user.'})
    async putMe(
      @Res() res,
      @Request() req,
      @Body(new ValidateMeDtoPipes()) user: MeDto,
    ) {
        try {
            return res.status(HttpStatus.OK).json(await this.service.putMe(req.user.id, user));
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json(error);
        }
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('/me')
    @ApiResponse({ status: 200, description: 'Current user info.'})
    @ApiOperation({title: 'Get current user info.'})
    async getProfile(
      @Request() req,
      @Res() res,
    ) {
        try {
            return res.status(HttpStatus.OK).json(await this.service.getUsers(req.user.id));
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json(error);
        }
    }
}
