import * as config from "../../config/search";
import { ALL_INDEX } from "../common/constants";
import { Inject, Injectable } from "@nestjs/common";
import { Document } from "../document/entities/document.entity";
import { IFieldQuery } from "./dto/field.query.interface";
import { ISearchResponseInterface } from "./dto/search.response.interface";
import { IndexedDocumentDto } from "../document/dto/document.dto";
import { ISearchBodyInterface } from "./dto/search.body.interface";
import { IMustQuery } from "./dto/must.query.interface";
import { IShouldQuery } from "./dto/should.query.interface";
const { Client } = require('@elastic/elasticsearch');
const esClient = new Client({ node: process.env.ELASTIC_URI });

@Injectable()
export class SearchService {
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
    ) {}

    private async search(index: string, body: object) {
        try {
            return await esClient.search({index, body});
        } catch (error) {
            throw error
        }
    };

    private getShouldQuery(queries: Array<string>): Array<object> {
        let should = [];
        for (const query of queries) {
            for (const term of config.terms) {
                const match = {};
                match[term.name] = {
                    query,
                    boost: term.boost ? term.boost : 1,
                    fuzziness: term.fuzziness ? term.fuzziness : 0,
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
            const configuration = config.terms.find((el) => {
                return el.name === fieldQuery.field
            });

            if (configuration) {
                match[fieldQuery.field] = {
                    query: fieldQuery.query,
                    boost: configuration.boost,
                    fuzziness: configuration.fuzziness,
                };

                must.push({ match })
            }
        }

        return must;
    };

    async searchAllData() {
        try {
            let body = {
                size: 20,
                from: 0,
                query: {
                    match_all: {}
                }
            };

            const results = await this.search(ALL_INDEX, body);
            return results.body.hits.hits
        } catch (error) {
            return error;
        }
    }

    async searchData(query: string, from: number = 0, size: number = 10, content: string = ALL_INDEX, visibility: boolean = true): Promise<Array<object>> {
        try {
            const should = this.getShouldQuery(query.split("|"));

            if (visibility) {
                should.push({
                    match: {
                        visibility: {
                            query: Boolean(visibility),
                            boost: 3,
                            operator: "AND"
                        }
                    }
                });
            }

            let body: ISearchBodyInterface<IShouldQuery>= {
                size,
                from,
                query: {
                    bool: { should }
                }
            };
            let results: ISearchResponseInterface<IndexedDocumentDto> = await this.search(content, body);
            console.log(`found ${results.body.hits.total.value} items in ${results.body.took}ms`);
            return results.body.hits.hits
        } catch (error) {
            return error
        }
    }

    async searchByFields(fieldsQuery: Array<IFieldQuery>, from: number = 0, size: number = 10, content: string = ALL_INDEX): Promise<Array<object>> {
        try {
            const must = await this.getMustQuery(fieldsQuery);
            let body: ISearchBodyInterface<IMustQuery> = {
                size: size,
                from: from,
                query: {
                    bool: { must }
                }
            };
            let results: ISearchResponseInterface<IndexedDocumentDto> = await this.search(content, body);
            console.log(`found ${results.body.hits.total.value} items in ${results.body.took}ms`);
            return results.body.hits.hits
        } catch (error) {
            return error
        }
    }
}
