import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { searchProviders } from './search.providers';
import { DatabaseModule } from '../database/database.module';
import { SearchIndexing } from './search.indexing';

@Module({
    imports: [DatabaseModule],
    controllers: [SearchController],
    providers: [
        SearchService,
        SearchIndexing,
        ...searchProviders,
    ],
})

export class SearchModule {}
