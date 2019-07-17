import { Document } from './entities/document.entity';

export const documentProviders = [
    {
        provide: 'DocumentRepository',
        useValue: Document,
    },
];
