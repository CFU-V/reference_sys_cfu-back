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
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiUseTags, ApiBearerAuth, ApiConsumes, ApiImplicitFile, ApiResponse, ApiOperation, ApiImplicitQuery} from '@nestjs/swagger';
import { SearchService } from "./search.service";
import {DocumentDto} from "../document/dto/document.dto";
import {SearchByFieldDto} from "./dto/search.by.field.dto";
import { LiteAuthGuard } from "../auth/guards/lite.guard";
import { User } from "../user/decorators/user.decorator";
import {UserDto} from "../user/dto/user.dto";

@ApiUseTags('search')
@Controller('search')
@ApiBearerAuth()
export class SearchController {
    constructor(
        private searchService: SearchService,
    ) {}

    @Get('/')
    @ApiResponse({ status: 200, description: 'Result of search.'})
    @ApiOperation({title: 'Search content.'})
    @ApiImplicitQuery({
        name: 'content',
        description: 'Array for search (documents, users, etc.). All indexes by default.',
        required: false,
        type: String,
    })
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
    @ApiImplicitQuery({
        name: 'search',
        description: 'Search request.',
        required: false,
        type: String,
    })
    @UseGuards(LiteAuthGuard)
    async search(
        @Res() res,
        @Request() req,
        @User() user,
        @Query('search') search: string,
        @Query('pageSize') pageSize: number,
        @Query('page') page: number,
        @Query('content') content: string,
    ) {
        try {
            const visibility = !user;
            const result = search ? await this.searchService
                .searchData(search, page, pageSize, content, visibility) :
                await this.searchService.searchAllData(page, pageSize, visibility);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }

    @Post('/')
    @ApiResponse({ status: 200, description: 'Result of search.'})
    @ApiOperation({title: 'Search content by fields.'})
    @UseGuards(LiteAuthGuard)
    async searchByFields(
        @Res() res,
        @Request() req,
        @User() user,
        @Body() searchByField: SearchByFieldDto,
    ) {
        try {
            const visibility = !user;
            const result = await this.searchService.searchByFields(
                searchByField.fieldsQuery,
                searchByField.page,
                searchByField.pageSize,
                searchByField.content,
                visibility,
            );
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
