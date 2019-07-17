import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { documentProviders } from './document.providers';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [DocumentController],
    providers: [
        DocumentService,
        ...documentProviders,
    ],
})

export class DocumentModule {}
