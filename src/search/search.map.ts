import * as natural from 'natural';
const tokenizer = new natural.WordTokenizer();
import * as config from '../../config/search';
import { IndexedDocumentDto, IndexingDocumentDto } from "../document/dto/document.dto";
import {TOKENIZE_REGEXP} from "../common/constants";

export class Map {
    static async documents(document: IndexingDocumentDto): Promise<IndexedDocumentDto> {
        return {
            id: document.id,
            title: document.title,
            info: document.info,
            text: await Map.getWords(document.text),
            category: document.category.title,
            visibility: document.visibility,
            active: document.active,
            consultant_link: document.consultant_link,
            renew: document.renew,
            ownerId: document.ownerId,
            parentId: document.parentId,
            categoryId: document.categoryId,
            link: document.link,
            createdAt: this.refCreatedAt(document.createdAt).toString(),
            updatedAt: this.refCreatedAt(document.updatedAt).toString(),
        };
    }

    static async getWords(text: string): Promise<string> {
        let stemmed = [];
        let tokenized = await tokenizer.tokenize(text);

        for (const token of tokenized) {
            if (config.stopWords.indexOf(token) == -1) {
                let resultToken = token.toLowerCase();
                if (resultToken.match(TOKENIZE_REGEXP)) {
                    resultToken = natural.PorterStemmer.stem(resultToken);
                }
                stemmed.push(resultToken);
            }
        }

        return stemmed.join(' ');
    }

    static refCreatedAt(createdAt: Date): number {
        const date = new Date(createdAt);
        return new Date(`${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`).getTime();
    };
}
