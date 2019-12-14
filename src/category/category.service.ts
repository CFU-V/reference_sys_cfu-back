import {HttpException, HttpStatus, Inject, Injectable, OnModuleInit} from '@nestjs/common';
import { Document } from '../document/entities/document.entity';
import { Category } from './entities/category.entity';
import { CategoryDto } from './dto/category.dto';
import { UpdateCategoryDto } from './dto/update.category.dto';

@Injectable()
export class CategoryService {
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
        @Inject('CategoryRepository') private readonly categoryRepository: typeof Category,
    ) {}

    async addCategory(id: number, category: CategoryDto): Promise<Category> {
        try {
            return await this.categoryRepository.create({
                title: category.title,
            });
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async updateDocument(id: number, category: UpdateCategoryDto) {
        try {
            const oldCategory = await this.categoryRepository.findOne({ where: {id: category.id} });
            if (oldCategory) {
                return await oldCategory.update({
                    title: document.title ? document.title : oldCategory.title,
                });
            } else {
                return new HttpException(`Category with id ${category.id} doesn\`t exist.`, HttpStatus.BAD_REQUEST);
            }
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async deleteCategory(id: number) {
        const category = await this.categoryRepository.findOne({ where: { id } });
        const documents = await this.documentRepository.findAll({ where: { categoryId: id }, attributes: ['title']});
        if (category) {
            if (documents) {
                throw new HttpException(`Before delete this category delete the next documents: ${documents}.`, HttpStatus.CONFLICT);
            } else {
                const t = await this.categoryRepository.sequelize.transaction();
                try {
                    const deleted = await category.destroy({transaction: t});
                    t.commit();
                    return deleted;
                } catch (e) {
                    t.rollback();
                    throw e;
                }
            }
        } else {
          throw new HttpException(`Category with id ${id} doesn\`t exist.`, HttpStatus.BAD_REQUEST);
        }
    }
}
