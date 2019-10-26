import * as config from "../../config/search";
import { ALL_INDEX } from "../common/constants";
import { Inject, Injectable } from "@nestjs/common";
import { Document } from "../document/entities/document.entity";
import { IFieldQuery } from "./dto/field.query.interface";
import { ISearchResponseInterface } from "./dto/search.response.interface";
import { IndexedDocumentDto } from "../document/dto/document.dto";
import { ISearchBodyInterface } from "./dto/search.body.interface";
import { IMustQuery } from "./dto/must.query.interface";
import { PAGE, PAGE_SIZE } from '../common/paging/paging.constants';
import { EntitiesWithPaging } from '../common/paging/paging.entities';
const { Client } = require('@elastic/elasticsearch');
const esClient = new Client({ node: process.env.ELASTIC_URI });

@Injectable()
export class SearchService {
    static instance: SearchService;
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
    ) {}

    private async search(index: string, body: object) {
        try {
            return await esClient.search({index, body});
        } catch (error) {
            throw error;
        }
    }

    static getInstance(documentRepository) {
        if (!SearchService.instance) {
            SearchService.instance = new SearchService(documentRepository);
        }
        return SearchService.instance;
    }

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

    private getMustQuery(fieldsQuery: IFieldQuery[]): Array<object> {
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

    async searchAllData(
        page: number = 0,
        pageSize: number = 10,
        visibility: boolean = true,
    ): Promise<EntitiesWithPaging> {
        try {
            page = page > 0 ? page : PAGE;
            pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
            const offset: number = pageSize * page;
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
                size: pageSize,
                from: offset,
                query: { bool: { must } },
            };

            const results = await this.search(ALL_INDEX, body);
            return new EntitiesWithPaging(results.body.hits.hits, results.body.hits.total.value, page, pageSize);
        } catch (error) {
            return error;
        }
    }

    async searchData(
        query: string,
        page: number = 0,
        pageSize: number = 10,
        content: string = ALL_INDEX,
        visibility: boolean = true,
    ): Promise<EntitiesWithPaging> {
        try {
            page = page > 0 ? page : PAGE;
            pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
            const offset: number = pageSize * page;
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
                size: pageSize,
                from: offset,
                query: { bool: { must } },
            };

            const results: ISearchResponseInterface<IndexedDocumentDto> = await this.search(content, body);
            console.log(`found ${results.body.hits.total.value} items in ${results.body.took}ms`);
            return new EntitiesWithPaging(results.body.hits.hits, results.body.hits.total.value, page, pageSize);
        } catch (error) {
            console.log(error);
            return error;
        }
    }

    async searchByFields(
        fieldsQuery: IFieldQuery[],
        page: number = 0,
        pageSize: number = 10,
        content: string = ALL_INDEX,
        visibility: boolean = true,
    ): Promise<EntitiesWithPaging> {
        try {
            page = page > 0 ? page : PAGE;
            pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
            const offset: number = pageSize * page;
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
                size: pageSize,
                from: offset,
                query: {
                    bool: { must },
                },
            };

            const results: ISearchResponseInterface<IndexedDocumentDto> = await this.search(content, body);
            console.log(`found ${results.body.hits.total.value} items in ${results.body.took}ms`);
            return new EntitiesWithPaging(results.body.hits.hits, results.body.hits.total.value, page, pageSize);
        } catch (error) {
            console.log(error);
            return error;
        }
    }
}
