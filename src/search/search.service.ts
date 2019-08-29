import * as config from "../../config/search";
import { ALL_INDEX } from "../common/constants";
import { Inject, Injectable } from "@nestjs/common";
import { Document } from "../document/entities/document.entity";
import { IFieldQuery } from "./dto/field.query.interface";
import { ISearchResponseInterface } from "./dto/search.response.interface";
import { IndexedDocumentDto } from "../document/dto/document.dto";
import { ISearchBodyInterface } from "./dto/search.body.interface";
import { IMustQuery } from "./dto/must.query.interface";
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
            throw error;
        }
    };

    private getShouldQuery(queries: Array<string>): Array<object> {
        try {
            const should = [];

            for (const query of queries) {
                for (const term of config.terms) {
                    if (term.name.indexOf('.keyword') === -1) {
                        const match = {};
                        if (term.type === 'string') {
                            match[term.name] = {
                                query,
                                boost: term.boost ? term.boost : 1,
                                fuzziness: term.fuzziness ? term.fuzziness : 0,
                            };
                            should.push({ match });
                        } else if (term.type !== 'boolean') {
                            match[term.name] = { query };
                            should.push({ match });
                        }
                    }
                }
            }

            return should;
        } catch (error) {
            console.log(error);
            return error;
        }
    }

    private getMustQuery(fieldsQuery: Array<IFieldQuery>): Array<object> {
        try {
            const must = [];

            for (const fieldQuery of fieldsQuery) {
                const match = {};
                const term = {};
                const configuration = config.terms.find((el) => {
                    return el.name === fieldQuery.field
                });

                if (configuration) {
                    if (configuration.type === 'string') {
                        match[fieldQuery.field] = {
                            query: fieldQuery.query,
                            boost: configuration.boost ? configuration.boost : 1,
                            fuzziness: configuration.fuzziness ? configuration.fuzziness : 0,
                        };
                    } else {
                        match[fieldQuery.field] = { query: fieldQuery.query };
                    }
                    must.push({ match });
                }
            }

            return must;
        } catch (error) {
            console.log(error);
            return error;
        }
    };

    async searchAllData(visibility: boolean = true) {
        try {
            const must = [];

            if (visibility) {
                must.push({
                    term: {
                        visibility: {
                            value: true,
                        },
                    },
                });
            }

            const body = {
                size: 20,
                from: 0,
                query: { bool: { must } },
            };

            const results = await this.search(ALL_INDEX, body);
            return results.body.hits.hits;
        } catch (error) {
            return error;
        }
    }

    async searchData(
        query: string,
        from: number = 0,
        size: number = 10,
        content: string = ALL_INDEX,
        visibility: boolean = true,
    ): Promise<Array<object>> {
        try {
            const should = this.getShouldQuery(query.split('|'));
            const must = [];
            must.push({ bool: { should } });

            if (visibility) {
                must.push({
                    term: {
                        visibility: {
                            value: true,
                        },
                    },
                });
            }

            const body: ISearchBodyInterface<IMustQuery> = {
                size,
                from,
                query: { bool: { must } },
            };

            const results: ISearchResponseInterface<IndexedDocumentDto> = await this.search(content, body);
            console.log(`found ${results.body.hits.total.value} items in ${results.body.took}ms`);
            return results.body.hits.hits;
        } catch (error) {
            console.log(error);
            return error;
        }
    }

    async searchByFields(
        fieldsQuery: Array<IFieldQuery>,
        from: number = 0,
        size: number = 10,
        content: string = ALL_INDEX,
        visibility: boolean = true,
    ): Promise<Array<object>> {
        try {
            const must = await this.getMustQuery(fieldsQuery);

            if (visibility) {
                must.push({
                    term: {
                        visibility: {
                            value: true,
                        },
                    },
                });
            }

            const body: ISearchBodyInterface<IMustQuery> = {
                size,
                from,
                query: {
                    bool: { must },
                },
            };

            const results: ISearchResponseInterface<IndexedDocumentDto> = await this.search(content, body);
            console.log(`found ${results.body.hits.total.value} items in ${results.body.took}ms`);
            return results.body.hits.hits;
        } catch (error) {
            console.log(error);
            return error;
        }
    }
}
