import * as natural from 'natural';
const tokenizer = new natural.WordTokenizer();
import * as config from '../../config/search';
import { IndexedDocumentDto, IndexingDocumentDto } from '../document/dto/document.dto';
import {TOKENIZE_REGEXP} from '../common/constants';
import Utils from '../core/Utils';
import DocumentParser from '../document/document.parser';

export class Map {
    static async documents(document: IndexingDocumentDto): Promise<IndexedDocumentDto> {
        return {
            id: document.id,
            title: document.title,
            info: document.info,
            text: await Map.getWords(document.text),
            category: document.category.title,
            visibility: document.visibility,
            active: document.active.toString(),
            consultant_link: document.consultant_link,
            number: Utils.prettifyDocumentNumber(document.number),
            renew: document.renew.toString(),
            registeredAt: document.consultant_link ? this.refCreatedAt(document.createdAt).toString() : await this.getRegisteredDataString(document.link),
            ownerId: document.ownerId,
            parentId: document.parentId,
            categoryId: document.categoryId,
            link: document.link,
            createdAt: this.refCreatedAt(document.createdAt).toString(),
            updatedAt: this.refCreatedAt(document.updatedAt).toString(),
            date: this.refCreatedAt(document.date).toString(),
        };
    }

    static async getWords(text: string): Promise<string> {
        const stemmed = [];
        const tokenized = await tokenizer.tokenize(text);

        for (const token of tokenized) {
            if (config.stopWords.indexOf(token) === -1) {
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

    static async getRegisteredDataString(link: string): Promise<string> {
        const documentParser = new DocumentParser();
        const props = await documentParser.getProps(link);
        return await Map.refCreatedAt(new Date(Date.parse(props.createdAt))).toString();
    };
}
