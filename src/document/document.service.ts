import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Document } from './entities/document.entity';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { DocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentService {
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
    ) {}

    async add(ownerId: number, filePath: string, document: DocumentDto) {
        return await this.documentRepository.create({
            title: document.title,
            ownerId,
            parentId: document.parentId,
            info: document.info,
            type: document.type,
            active: document.active,
            visibility: document.visibility,
            renew: document.renew,
            link: filePath,
        });
    }
}
