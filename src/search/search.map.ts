import * as natural from 'natural';
const tokenizer = new natural.WordTokenizer();
import * as config from '../../config/search';
import {IndexedDocumentDto } from "../document/dto/document.dto";

export class Map {
    static async documents(document: IndexedDocumentDto): Promise<IndexedDocumentDto> {
        return {
            id: document.id,
            title: document.title,
            info: document.info,
            text: await Map.getWords(document.text),
            type: document.type,
            createdAt: document.createdAt,
        };
    }

    static async getWords(text: string): Promise<string> {
        let stemmed = [];
        let tokenized = await tokenizer.tokenize(text);

        for (const token of tokenized) {
            if (config.stopWords.indexOf(token) == -1) {
                let resultToken = token.toLowerCase();
                if (resultToken.match(/[a-zА-Я0-9]/gi)) {
                    resultToken = natural.PorterStemmer.stem(resultToken);
                }
                stemmed.push(resultToken);
            }
        }

        return stemmed.join(' ');
    }
}
