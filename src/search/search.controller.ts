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
import {SearchService} from "./search.service";

@ApiUseTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
    constructor(
        private searchService: SearchService,
    ) {}
}
