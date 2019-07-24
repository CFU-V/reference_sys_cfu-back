import { Module } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { BookmarkController } from './bookmark.controller';
import { bookmarkProviders } from './bookmark.providers';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [BookmarkController],
    providers: [
        BookmarkService,
        ...bookmarkProviders,
    ],
})

export class BookmarkModule {}
