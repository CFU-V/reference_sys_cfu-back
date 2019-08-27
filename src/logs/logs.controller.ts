import {
    Controller,
    Get, Header, HttpStatus, Param, Query, Request, Res,
    UseGuards,
} from '@nestjs/common';
import { ApiUseTags, ApiBearerAuth, ApiResponse, ApiImplicitQuery, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from './logs.service';

@ApiUseTags('logs')
@ApiBearerAuth()
@Controller('logs')
export class LogsController {
    constructor(private service: LogsService) {}

    @Get('/download/:fileName')
    @Header('Content-type', 'text/plain')
    @ApiOperation({title: 'Get log file.'})
    @UseGuards(AuthGuard('admin'))
    async getLogFile(
        @Res() res,
        @Request() req,
        @Param('fileName') fileName: string,
    ) {
        try {
            return (await this.service.downloadLogs(fileName)).pipe(res);
        } catch (error) {
            console.log(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }

    @Get('/list')
    @Header('Content-type', 'text/plain')
    @ApiOperation({title: 'Get list of log files.'})
    @UseGuards(AuthGuard('admin'))
    async getListLogs(
        @Res() res,
        @Request() req,
    ) {
        try {
            const list = await this.service.getList();
            return res.status(HttpStatus.OK).json(list);
        } catch (error) {
            console.log(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }
}
