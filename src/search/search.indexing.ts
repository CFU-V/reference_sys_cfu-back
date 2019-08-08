import { Map } from './search.map';
import DocumentParser from '../document/document.parser';
import { DOCUMENT_INDEX } from '../common/constants';
import {Inject, Injectable, OnModuleInit} from "@nestjs/common";
import { Document } from "../document/entities/document.entity";
import { CronJob } from "cron";
import { Category } from "../document/entities/category.entity";
const { Client } = require('@elastic/elasticsearch');
const esClient = new Client({ node: process.env.ELASTIC_URI });

@Injectable()
export class SearchIndexing implements OnModuleInit {
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
    ) {}

    async onModuleInit() {
        this.indexCronJob();
    }

    indexCronJob() {
        return new CronJob('0 */12 * * *', this._do.bind(this)).start();
    }

    async _do() {
        try {
            console.log('Start indexing ...');
            let data = {
                documents: [],
            };

            let documents = await this.documentRepository.findAll({
                where: { parentId: null },
                include: [{model: Category, as: 'category', attributes: ['title']}]
            });

            for (let document of documents) {
                const documentParser = new DocumentParser(this.documentRepository, document);
                document.setDataValue('text', await documentParser.extract());
                let item = await Map.documents(document.get({ plain: true }));
                data.documents.push(item);
            }

            await this.bulkIndex(DOCUMENT_INDEX, data.documents);
        } catch (error) {
            throw error;
        }
    }

    async bulkIndex(index, data) {
        try {
            let bulkBody = data.flatMap(item => [{ index: { _index: index, _id: item.id } }, item]);

            const { body: bulkResponse } = await esClient.bulk({ body: bulkBody, refresh: true });

            if (bulkResponse.errors) {
                const erroredDocuments = [];

                bulkResponse.items.forEach((action, i) => {
                    const operation = Object.keys(action)[0];

                    if (action[operation].error) {
                        erroredDocuments.push({
                            status: action[operation].status,
                            error: action[operation].error,
                            operation: bulkBody[i * 2],
                            document: bulkBody[i * 2 + 1]
                        })
                    }
                });

                console.log(`Errored documents: ${erroredDocuments}`)
            }

            const { body: count } = await esClient.count({ index });
            console.log(`Successfully indexed ${JSON.stringify(count)} documents`);
        } catch (error) {
            console.log(error)
        }
    };

    async update(index, item) {
        try {
            let updateBody = [{ index: { _index: index, _id: item.id } }, item];

            const { body: bulkResponse } = await esClient.bulk({ body: updateBody, refresh: true });

            if (bulkResponse.errors) {
                const erroredDocuments = [];

                bulkResponse.items.forEach((action, i) => {
                    const operation = Object.keys(action)[0];

                    if (action[operation].error) {
                        erroredDocuments.push({
                            status: action[operation].status,
                            error: action[operation].error,
                            operation: updateBody[i * 2],
                            document: updateBody[i * 2 + 1]
                        })
                    }
                });

                console.log(`Errored documents: ${erroredDocuments}`)
            }

            const { body: count } = await esClient.count({ index });
            console.log(`Successfully updated index of ${JSON.stringify(count)} document`);
        } catch (error) {
            console.log(error)
        }
    };

    indices() {
        return esClient.cat.indices({v: true})
            .then(console.log)
            .catch(error => console.error(`Error connecting to the es client: ${error}`));
    };

    deleteIndeces(indeces: Array<string>) {
        esClient.indices.delete({index: indeces}, (error) => {
            if (error) {
                console.error(error.message);
            } else {
                console.log("Indexes has been deleted!");
            }
        })
    }

    async deleteIfExist(index: string, id: number) {
        const { body } = await esClient.exists({index, id});
        if (body) {
            await esClient.delete({index, id, refresh: true});
        }
    }
}
