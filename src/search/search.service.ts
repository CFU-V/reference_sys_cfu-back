import * as config from "../../config/search";
import {ALL_INDEX, DOCUMENT_INDEX} from "../common/constants";
import {Inject, Injectable} from "@nestjs/common";
import {Document} from "../document/entities/document.entity";
import { IFieldQuery } from "./dto/field.query.interface";
import { ISearchResponseInterface } from "./dto/search.response.interface";
import { IndexedDocumentDto } from "../document/dto/document.dto";
import { ISearchBodyInterface } from "./dto/search.body.interface";
import {IMustQuery} from "./dto/must.query.interface";
const { Client, RequestParams } = require('@elastic/elasticsearch');
const esClient = new Client({ node: 'http://localhost:9200' });

@Injectable()
export class SearchService {
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
    ) {}

    private async search(index: Array<string>, body: object) {
        return await esClient.search({index, body});
    };

    private getShouldQuery(queries: Array<string>): Array<object> {
        let should = [];

        for (const query of queries) {
            for (const term of config.terms) {
                const match = {};
                match[term.name] = {
                    query,
                    boost: term.boost,
                    fuzziness: term.fuzziness
                };

                should.push({ match })
            }
        }

        return should
    };

    private getMustQuery(fieldsQuery: Array<IFieldQuery>): Array<object> {
        let must = [];

        for (const fieldQuery of fieldsQuery) {
            const match = {};
            match[fieldQuery.field] = {
                query: fieldQuery.query,
            };

            must.push({ match })
        }

        return must;
    };

    searchAllData() {
        let body = {
            size: 20,
            from: 0,
            query: {
                match_all: {}
            }
        };

        this.search([ALL_INDEX], body)
            .then(results => {
                console.log(`found ${results.hits.total} items in ${results.took}ms`);
                results.hits.hits.forEach(
                    (hit, index) => console.log(
                        JSON.stringify(hit._source)
                    )
                )
            })
            .catch(error => {return error});
    }

    async searchData(query: string, from: number = 0, size: number = 10, content: Array<string> = [ALL_INDEX]): Promise<Array<object>> {
        try {
            let body = {
                size: size,
                from: from,
                query: {
                    bool: {
                        should: this.getShouldQuery(query.split("|"))
                    }
                }
            };
            let results = await this.search(content, body);
            console.log(`found ${results.hits.total} items in ${results.took}ms`);
            console.log(JSON.stringify(body));
            return results.hits.hits
        } catch (error) {
            return error
        }
    }

    async searchByFields(fieldsQuery: Array<IFieldQuery>, from: number = 0, size: number = 10, content: Array<string> = [ALL_INDEX]): Promise<Array<object>> {
        try {
            let body: ISearchBodyInterface<IMustQuery> = {
                size: size,
                from: from,
                query: {
                    bool: {
                        must: await this.getMustQuery(fieldsQuery)
                    }
                }
            };
            let results: ISearchResponseInterface<IndexedDocumentDto> = await this.search(content, body);
            console.log(`found ${results.hits.total} items in ${results.took}ms`);
            console.log(JSON.stringify(body));
            return results.hits.hits
        } catch (error) {
            return error
        }
    }
}
