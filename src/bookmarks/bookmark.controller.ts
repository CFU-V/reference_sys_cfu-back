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
} from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { ApiUseTags, ApiBearerAuth, ApiResponse, ApiImplicitQuery, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ValidateObjectId } from '../shared/pipes/validate-object-id.pipes';
import { BookmarkDto } from './dto/bookmark.dto';

@ApiUseTags('bookmarks')
@ApiBearerAuth()
@Controller('bookmarks')
export class BookmarkController {
    constructor(private service: BookmarkService) {}

    @Post('/')
    @UseGuards(AuthGuard('jwt'))
    @ApiResponse({ status: 200, description: 'Created bookmark info.'})
    @ApiOperation({title: 'Add new bookmark.'})
    async addBookmark(
        @Res() res,
        @Request() req,
        @Body() newBookmark: BookmarkDto,
    ) {
        try {
            const bookmark = await this.service.addBookmark(req.user.id, newBookmark.docId, newBookmark.control);
            res.status(HttpStatus.OK).json(bookmark);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }

    @Put('/')
    @UseGuards(AuthGuard('jwt'))
    @ApiResponse({ status: 200, description: 'Updated bookmark.'})
    @ApiOperation({title: 'Update bookmark.'})
    async putBookmark(
        @Res() res,
        @Request() req,
        @Body() newBookmark: BookmarkDto,
    ) {
        try {
            const bookmark = await this.service.putBookmark(req.user.id, newBookmark.docId, newBookmark.control);
            return res.status(HttpStatus.OK).json(bookmark);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('/')
    @ApiResponse({ status: 200, description: 'Bookmarks current user' })
    @ApiOperation({title: 'Get bookmarks of current user.'})
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
    async getBookmarks(
      @Res() res,
      @Request() req,
      @Query('page') page: number,
      @Query('pageSize') pageSize: number,
    ) {
        try {
            return res.status(HttpStatus.OK).json(await this.service.getBookmarks(req.user.id, page, pageSize));
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json(error);
        }
    }

    @UseGuards(AuthGuard('jwt'))
    @ApiResponse({ status: 200, description: 'Bookmark deleted'})
    @ApiOperation({title: 'Delete bookmark.'})
    @ApiImplicitQuery({
        name: 'docId',
        description: 'Id of document in bookmark.',
        required: true,
        type: Number,
    })
    @Delete('/')
    async deleteBookmark(
        @Request() req,
        @Res() res,
        @Query('docId', new ValidateObjectId()) docId: number,
    ) {
        try {
            return res.status(HttpStatus.OK).json(await this.service.deleteBookmark(req.user.id, docId));
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json(error);
        }
    }
}
