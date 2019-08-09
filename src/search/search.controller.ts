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
import { ApiUseTags, ApiBearerAuth, ApiConsumes, ApiImplicitFile, ApiResponse, ApiOperation, ApiImplicitQuery} from '@nestjs/swagger';
import { SearchService } from "./search.service";
import {DocumentDto} from "../document/dto/document.dto";
import {SearchByFieldDto} from "./dto/search.by.field.dto";

@ApiUseTags('search')
@Controller('search')
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
        name: 'to',
        description: 'End for pagination.',
        required: false,
        type: Number,
    })
    @ApiImplicitQuery({
        name: 'from',
        description: 'Start for pagination.',
        required: false,
        type: Number,
    })
    @ApiImplicitQuery({
        name: 'search',
        description: 'Search request.',
        required: false,
        type: String,
    })
    async search(
        @Res() res,
        @Request() req,
        @Query('search') search: string,
        @Query('visibility') visibility: boolean,
        @Query('from') from: number,
        @Query('to') to: number,
        @Query('content') content: string,
    ) {
        try {
            const result = search ? await this.searchService.searchData(search, from, to, content, visibility) : await this.searchService.searchAllData();
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }

    @Post('/')
    @ApiResponse({ status: 200, description: 'Result of search.'})
    @ApiOperation({title: 'Search content by fields.'})
    async searchByFields(
        @Res() res,
        @Request() req,
        @Body() searchByField: SearchByFieldDto,
    ) {
        try {
            const result = await this.searchService.searchByFields(searchByField.fieldsQuery, searchByField.from, searchByField.to, searchByField.content);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
