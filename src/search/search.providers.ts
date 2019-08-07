import { Document } from '../document/entities/document.entity';

export const searchProviders = [
    {
        provide: 'DocumentRepository',
        useValue: Document,
    },
];
