import {
    Controller,
    Res,
    HttpStatus,
    Post,
    Body,
    Request,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiUseTags, ApiBearerAuth, ApiConsumes, ApiImplicitFile, ApiResponse, ApiOperation, ApiImplicitQuery} from '@nestjs/swagger';
import { MessageService } from './message.service';
import { MessageDto } from './dto/message.dto';

@ApiUseTags('message')
@Controller('message')
@ApiBearerAuth()
export class MessageController {
    constructor(
        private messageService: MessageService,
    ) {}

    @UseGuards(AuthGuard('admin'))
    @Post('/send')
    @UseGuards(AuthGuard('staff'))
    @ApiResponse({ status: 200, description: 'Message sent.' })
    @ApiOperation({title: 'Send a message.'})
    async shareDocument(
        @Res() res,
        @Request() req,
        @Body() message: MessageDto,
    ) {
        try {
            const response = await this.messageService.send(message);
            res.status(HttpStatus.OK).json(response);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }
}
