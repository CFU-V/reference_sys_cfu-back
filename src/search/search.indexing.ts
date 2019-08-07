import { Map } from './search.map';
import DocumentParser from '../document/document.parser';
import { DOCUMENT_INDEX } from '../common/constants';
import {Inject, Injectable, OnModuleInit} from "@nestjs/common";
import { Document } from "../document/entities/document.entity";
import { CronJob } from "cron";
import {Role} from "../user/entities/role.entity";
import {Category} from "../document/entities/category.entity";
const { Client } = require('@elastic/elasticsearch');
const esClient = new Client({ node: process.env.ELASTIC_URI });

@Injectable()
export class SearchIndexing implements OnModuleInit {
    constructor(
        @Inject('DocumentRepository') private readonly documentRepository: typeof Document,
    ) {}

    async onModuleInit() {
        console.log('INIT...');
        this._do();
    }

    indexCronJob() {
        return new CronJob('*/3 * * * *', this._do);
    }

    async _do() {
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
            document.setDataValue('text', await documentParser.format());

            let item = await Map.documents(document.get({ plain: true }));

            data.documents.push(item);
        }

        this.bulkIndex(DOCUMENT_INDEX, data.documents);
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
}
