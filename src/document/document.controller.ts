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
import { DocumentService } from './document.service';
import { ApiUseTags, ApiBearerAuth, ApiConsumes, ApiImplicitFile, ApiResponse, ApiOperation, ApiImplicitQuery} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import Utils from '../core/Utils';
import { ValidateObjectId } from '../shared/pipes/validate-object-id.pipes';
import * as path from 'path';
import { verify } from 'jsonwebtoken';
import { UserService } from '../user/user.service';

@ApiUseTags('document')
@ApiBearerAuth()
@Controller('document')
export class DocumentController {
    constructor(
        private documentService: DocumentService,
        private userService: UserService,
    ) {}

    @Post('/')
    @UseGuards(AuthGuard('staff'))
    @ApiConsumes('multipart/form-data')
    @ApiImplicitFile({ name: 'file', required: true })
    @ApiResponse({ status: 200, description: 'Created document info', type: DocumentDto })
    @ApiOperation({title: 'Add new document.'})
    @UseInterceptors(FileInterceptor('file',
    {
        storage: diskStorage({
            destination: process.env.DOCUMENT_STORAGE,
            filename: (req, file, cb) => {
                const randomName = Utils.getRandomFileName();
                return cb(null, `${randomName}${extname(file.originalname)}`);
            },
        }),
        fileFilter: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            if (ext !== '.doc' && ext !== '.docx') {
                return cb(new Error('Only doc/docx are allowed'), false);
            }
            cb(null, true);
        },
    },
    ))
    async addDocument(
      @Res() res,
      @Request() req,
      @Body() documentInfo: DocumentDto,
      @UploadedFile() file,
    ) {
        try {
            const document = await this.documentService.addDocument(req.user.id, file.path, documentInfo);

            return res.status(HttpStatus.OK).json(document);
        } catch (error) {
            const createdFile = fs.existsSync(file.path);

            if (createdFile) {
                fs.unlinkSync(file.path);
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }

    @Get('/list')
    @ApiResponse({ status: 200, description: '', type: DocumentDto })
    @ApiOperation({title: 'Get list of documents.'})
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
    async getListDocument(
        @Res() res,
        @Request() req,
        @Query('page') page: number,
        @Query('pageSize') pageSize: number,
    ) {
        try {
            const user = await this.userService.verifyByToken(req.headers.authorization);
            const documents = await this.documentService.getListDocument(user, page, pageSize);
            return res.status(HttpStatus.OK).json(documents);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }

    @Get('/')
    @ApiResponse({ status: 200, description: '', type: DocumentDto })
    @ApiOperation({title: 'Get document.'})
    @ApiImplicitQuery({
        name: 'id',
        description: 'The id of document',
        required: true,
        type: Number,
    })
    async getDocument(
        @Res() res,
        @Request() req,
        @Query('id') id: number,
    ) {
        try {
            const user = await this.userService.verifyByToken(req.headers.authorization);
            const document = await this.documentService.getDocument(id, user);

            if (!document) {
                return res.status(HttpStatus.BAD_REQUEST).json({msg: 'Document doesn`t exist or permissions denied.'});
            }

            return res.status(HttpStatus.OK).json(document);
        } catch (error) {
            console.log(error)
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }

    @Put('/')
    @ApiResponse({ status: 200, description: 'Update document info', type: DocumentDto })
    @ApiOperation({title: 'Update document.'})
    @UseGuards(AuthGuard('staff'))
    async putDocument(
      @Res() res,
      @Request() req,
      @Body() documentInfo: UpdateDocumentDto,
    ) {
        try {
            const document = await this.documentService.updateDocument(req.user.id, documentInfo);

            return res.status(HttpStatus.OK).json(document);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }

    @Delete('/')
    @ApiResponse({ status: 200, description: 'Delete document.'})
    @ApiOperation({title: 'Delete document.'})
    @UseGuards(AuthGuard('staff'))
    async deleteDocument(
      @Res() res,
      @Request() req,
      @Query('id', new ValidateObjectId()) id: number,
    ) {
        try {
            await this.documentService.deleteDocument(id);
            return res.status(HttpStatus.OK).json({success: true});
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
