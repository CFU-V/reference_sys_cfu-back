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
import { CategoryService } from './category.service';
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
import { DocumentNewsDto } from './dto/document.news.dto';
import { stream } from 'winston';
import { CategoryDto } from './dto/category.dto';
import { UpdateCategoryDto } from './dto/update.category.dto';

@ApiUseTags('category')
@ApiBearerAuth()
@Controller('category')
export class CategoryController {
    constructor(
        private categoryService: CategoryService,
        private userService: UserService,
    ) {}

    @Post('/')
    @UseGuards(AuthGuard('staff'))
    @ApiResponse({ status: 200, description: 'Created document category', type: CategoryDto })
    @ApiOperation({title: 'Add new category.'})
    async addCategory(
      @Res() res,
      @Request() req,
      @Body() category: CategoryDto,
    ) {
        try {
            const newCategory = await this.categoryService.addCategory(req.user.id, category);
            res.status(HttpStatus.OK).json(newCategory);
            logger.info(`ADD_CATEGORY, : {user_id: ${req.user.id} }, category: ${JSON.stringify(category)}`);
        } catch (error) {
            console.log(error);
            if (error.message) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
            }
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }

    @Put('/')
    @ApiResponse({ status: 200, description: 'Update category info', type: UpdateCategoryDto })
    @ApiOperation({title: 'Update category.'})
    @UseGuards(AuthGuard('staff'))
    async putCategory(
      @Res() res,
      @Request() req,
      @Body() category: UpdateCategoryDto,
    ) {
        try {
            const categoryUpdated = await this.categoryService.updateCategory(req.user.id, category);
            res.status(HttpStatus.OK).json(categoryUpdated);
            logger.info(`UPDATE_CATEGORY, : {user_id: ${req.user.id} }, category: ${JSON.stringify(categoryUpdated)}`);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }

    @Delete('/')
    @ApiResponse({ status: 200, description: 'Delete category.'})
    @ApiOperation({title: 'Delete category.'})
    @UseGuards(AuthGuard('staff'))
    async deleteDocument(
      @Res() res,
      @Request() req,
      @Query('id', new ValidateObjectId()) id: number,
    ) {
        try {
            await this.categoryService.deleteCategory(id);
            res.status(HttpStatus.OK).json({success: true});
            logger.info(`DELETE_CATEGORY, : {user_id: ${req.user.id} }, categoryId: ${ id }`);
        } catch (error) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
        }
    }
}
