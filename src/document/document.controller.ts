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
import { ApiUseTags, ApiBearerAuth, ApiConsumes, ApiImplicitFile} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import Utils from '../core/Utils';
import { ValidateObjectId } from '../shared/pipes/validate-object-id.pipes';

@ApiUseTags('document')
@ApiBearerAuth()
@Controller('document')
export class DocumentController {
    constructor(private service: DocumentService) {}

    @Post('/')
    @UseGuards(AuthGuard('staff'))
    @ApiConsumes('multipart/form-data')
    @ApiImplicitFile({ name: 'file', required: true })
    @UseInterceptors(FileInterceptor('file',
    {
        storage: diskStorage({
            destination: process.env.DOCUMENT_STORAGE,
            filename: (req, file, cb) => {
                const randomName = Utils.getRandomFileName();
                return cb(null, `${randomName}${extname(file.originalname)}`);
            },
        }),
    },
    ))
    async addDocument(
      @Res() res,
      @Request() req,
      @Body() documentInfo: DocumentDto,
      @UploadedFile() file,
    ) {
        try {
            const document = await this.service.addDocument(req.user.id, file.path, documentInfo);

            return res.status(HttpStatus.OK).json(document);
        } catch (error) {
            const createdFile = fs.existsSync(file.path);

            if (createdFile) {
                fs.unlinkSync(file.path);
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }

    @Put('/')
    @UseGuards(AuthGuard('staff'))
    @ApiConsumes('multipart/form-data')
    @ApiImplicitFile({ name: 'file', required: false })
    @UseInterceptors(FileInterceptor('file'))
    async putDocument(
      @Res() res,
      @Request() req,
      @Body() documentInfo: UpdateDocumentDto,
      @UploadedFile() file,
    ) {
        try {
            const document = await this.service.updateDocument(req.user.id, file, documentInfo);

            return res.status(HttpStatus.OK).json(document);
        } catch (error) {
            if (file) {
                const createdFile = fs.existsSync(file.path);

                if (createdFile) {
                    fs.unlinkSync(file.path);
                }
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }

    @Delete('/')
    @UseGuards(AuthGuard('staff'))
    async deleteDocument(
      @Res() res,
      @Request() req,
      @Query('id', new ValidateObjectId()) id: number,
    ) {
        try {
            await this.service.deleteDocument(id);
            return res.status(HttpStatus.OK).json({success: true});
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
