import {
    Controller,
    Res,
    HttpStatus,
    Post,
    Body,
    Request,
    UseGuards, Get, Query, Delete, Put,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiUseTags, ApiBearerAuth, ApiConsumes, ApiImplicitFile, ApiResponse, ApiOperation, ApiImplicitQuery} from '@nestjs/swagger';
import { MessageService } from './message.service';
import { MessageDto } from './dto/message.dto';
import { LiteAuthGuard } from '../auth/guards/lite.guard';
import { User } from '../user/decorators/user.decorator';
import { ValidateObjectId } from '../shared/pipes/validate-object-id.pipes';
import logger from '../core/logger';

@ApiUseTags('message')
@Controller('message')
@ApiBearerAuth()
export class MessageController {
    constructor(
        private messageService: MessageService,
    ) {}

    @UseGuards(AuthGuard('admin'))
    @Post('/send')
    @ApiResponse({ status: 200, description: 'Message sent.' })
    @ApiOperation({title: 'Send a message.'})
    async sendMessage(
        @Res() res,
        @Request() req,
        @Body() message: MessageDto,
        @User() user,
    ) {
        try {
            message.authorId = user.id;
            await this.messageService.send(message);
            res.status(HttpStatus.OK).json({ message: 'message was sent' });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    @UseGuards(AuthGuard('lite'))
    @Put('/read')
    @ApiResponse({ status: 200, description: '' })
    @ApiOperation({title: 'Read a message.'})
    async readMessage(
        @Res() res,
        @Request() req,
        @Query('messageId') messageId: number,
        @User() user,
    ) {
        try {
            await this.messageService.read(user.id, messageId);
            res.status(HttpStatus.OK).json({ message: 'message was read' });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    @UseGuards(AuthGuard('lite'))
    @Get('/')
    @ApiResponse({ status: 200, description: 'Array of current user messages.' })
    @ApiOperation({title: 'Get messages of user.'})
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
    async getMessages(
        @Res() res,
        @Request() req,
        @User() user,
        @Query('page') page: number,
        @Query('pageSize') pageSize: number,
    ) {
        try {
            res.status(HttpStatus.OK).json(await this.messageService.getMessages(user.id));
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    @Delete('/')
    @ApiResponse({ status: 200, description: ''})
    @ApiOperation({title: 'Delete message'})
    @UseGuards(AuthGuard('lite'))
    async deleteMessage(
        @Res() res,
        @Request() req,
        @User() user,
        @Query('messageId', new ValidateObjectId()) messageId: number,
    ) {
        try {
            await this.messageService.deleteMessage(user.id, messageId);
            res.status(HttpStatus.OK).json({ success: true });
        } catch (error) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }
}
