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
    UseInterceptors, Header,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { ApiUseTags, ApiBearerAuth, ApiConsumes, ApiImplicitFile, ApiResponse, ApiOperation, ApiImplicitQuery} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import Utils from '../core/Utils';
import { ValidateObjectId } from '../shared/pipes/validate-object-id.pipes';
import * as path from 'path';
import { verify } from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { DocumentPropertyDto } from './dto/document.property.dto';
import { BodyDocumentPropertyDto } from './dto/document.body.property.dto';
import logger from '../core/logger';
import { GetDocumentDto } from './dto/deocument.get.dto';
import { DocumentSrhareDto } from './dto/document.srhare.dto';
import { DOCX_CONTENT_TYPE } from '../common/constants';

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
    @ApiImplicitFile({ name: 'file', required: false })
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
            if (ext !== '.docx') {
                return cb(new Error('Only docx are allowed'), false);
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
            res.status(HttpStatus.OK).json(document);
            logger.info(`ADD_DOCUMENT, : {user_id: ${req.user.id} }, document: ${JSON.stringify(document)}`);
        } catch (error) {
            Utils.deleteIfExist(file.path);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    @Post('/share')
    @UseGuards(AuthGuard('staff'))
    @ApiResponse({ status: 200, description: 'Mail sent.' })
    @ApiOperation({title: 'Share a documents.'})
    async shareDocument(
      @Res() res,
      @Request() req,
      @Body() mailInfo: DocumentSrhareDto,
    ) {
        try {
            const response = await this.documentService.shareDocument(req.user, mailInfo);
            res.status(HttpStatus.OK).json(response);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
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
    @ApiImplicitQuery({
        name: 's',
        description: 'Search query for autocomplete',
        required: false,
        type: String,
    })
    @ApiImplicitQuery({
        name: 'autocomplete',
        description: 'Is it autocomplete',
        required: false,
        type: Boolean,
    })
    async getListDocument(
        @Res() res,
        @Request() req,
        @Query('s') s: string,
        @Query('autocomplete') autocomplete: string,
        @Query('page') page: number,
        @Query('pageSize') pageSize: number,
    ) {
        try {
            const user = await this.userService.verifyByToken(req.headers.authorization);
            const documents = await this.documentService.getListDocument(user, autocomplete, s, page, pageSize);
            return res.status(HttpStatus.OK).json(documents);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }

    @Get('/')
    @ApiResponse({ status: 200, description: '', type: GetDocumentDto })
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
            const response = await this.documentService.getDocument(id, user);
            return res.status(HttpStatus.OK).json(response);
        } catch (error) {
            console.log(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }

    @Get('/download/:id')
    @Header('Content-type', DOCX_CONTENT_TYPE)
    @ApiResponse({ status: 200, description: '' })
    @ApiOperation({title: 'Download document.'})
    async downloadDocument(
        @Res() res,
        @Request() req,
        @Param('id') id: number
    ) {
        try {
            const user = await this.userService.verifyByToken(req.headers.authorization);
            return (await this.documentService.downloadDocument(id, user)).pipe(res);
        } catch (error) {
            console.log(error);
            res.setHeader('Content-type', 'application/json');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }

    @Get('/props')
    @ApiResponse({ status: 200, description: '', type: DocumentPropertyDto })
    @ApiOperation({title: 'Get document property.'})
    @UseGuards(AuthGuard('staff'))
    @ApiImplicitQuery({
        name: 'id',
        description: 'The id of document',
        required: true,
        type: Number,
    })
    async getDocumentProps(
        @Res() res,
        @Request() req,
        @Query('id') id: number,
    ) {
        try {
            const documentProps = await this.documentService.getDocumentProps(id);

            if (!documentProps) {
                return res.status(HttpStatus.BAD_REQUEST).json({msg: 'Document doesn`t exist or dosen`t have props.'});
            }

            return res.status(HttpStatus.OK).json(documentProps);
        } catch (error) {
            console.log(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }

    @Post('/props')
    @ApiResponse({ status: 200, description: '' })
    @ApiOperation({title: 'Set document property.'})
    @UseGuards(AuthGuard('staff'))
    async setDocumentProps(
        @Res() res,
        @Request() req,
        @Body() docProperty: BodyDocumentPropertyDto,
    ) {
        try {
            await this.documentService.setDocumentProps(docProperty);
            res.status(HttpStatus.OK).json({ success: true });
            logger.info(`SET_DOC_PROPS, : {user_id: ${req.user.id} }, documentID: ${docProperty.id}, props: ${JSON.stringify(docProperty)}`);
        } catch (error) {
            console.log(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }

    @Put('/')
    @ApiConsumes('multipart/form-data')
    @ApiImplicitFile({ name: 'file', required: false })
    @ApiResponse({ status: 200, description: 'Update document info', type: DocumentDto })
    @ApiOperation({title: 'Update document.'})
    @UseGuards(AuthGuard('staff'))
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
                if (ext !== '.docx') {
                    return cb(new Error('Only docx are allowed'), false);
                }
                cb(null, true);
            },
        },
    ))
    async putDocument(
      @Res() res,
      @Request() req,
      @Body() documentInfo: UpdateDocumentDto,
      @UploadedFile() file,
    ) {
        try {
            const document = await this.documentService.updateDocument(file ? file.path : null, req.user.id, documentInfo);
            res.status(HttpStatus.OK).json(document);
            logger.info(`UPDATE_DOCUMENT, : {user_id: ${req.user.id} }, documentInfo: ${JSON.stringify(documentInfo)}`);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
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
            res.status(HttpStatus.OK).json({success: true});
            logger.info(`DELETE_DOCUMENT, : {user_id: ${req.user.id} }, documentID: ${ id }`);
        } catch (error) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }
}
