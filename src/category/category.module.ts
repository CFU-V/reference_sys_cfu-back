import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { categoryProviders } from './category.providers';
import { DatabaseModule } from '../database/database.module';
import { UserService } from '../user/user.service';

@Module({
    imports: [DatabaseModule],
    controllers: [CategoryController],
    providers: [
        CategoryService,
        UserService,
        ...categoryProviders,
    ],
})

export class CategoryModule {}
