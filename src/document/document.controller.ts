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
import { DocumentDto } from './dto/document.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

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
                const randomName = Array(32)
                  .fill(null)
                  .map(() => {
                      return (Math.round(Math.random() * 16)).toString(16);
                  }).join('');
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
            const document = await this.service.add(req.user.id, file.path, documentInfo);

            return res.status(HttpStatus.OK).json(document);
        } catch (error) {
            const createdFile = fs.existsSync(file.path);

            if (createdFile) {
                fs.unlinkSync(file.path);
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
