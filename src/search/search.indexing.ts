import { Map } from './search.map';
import DocumentParser from '../document/document.parser';
import { DOCUMENT_INDEX } from '../common/constants';
import {Inject, Injectable, OnModuleInit} from "@nestjs/common";
import { Document } from "../document/entities/document.entity";
import { CronJob } from "cron";
import { Category } from "../document/entities/category.entity";
import {DocumentRecursiveDto} from "../document/dto/document.tree.dto";
import {QueryTypes} from "sequelize";
import {buildDocumentTree} from "../core/TreeBuilder";
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
            const data = {
                documents: [],
            };

            const documents = await this.documentRepository.findAll({
                where: { parentId: null },
                include: [{model: Category, as: 'category', attributes: ['title']}]
            });

            for (const document of documents) {
                let documents: Array<DocumentRecursiveDto> = await this.documentRepository.sequelize.query(
                    'WITH RECURSIVE sub_documents(id, link, "parentId", level) AS (' +
                    `SELECT id, link, "parentId", 1 FROM documents WHERE id = :nodeId ` +
                    'UNION ALL ' +
                    'SELECT d.id, d.link, d."parentId", level+1 ' +
                    'FROM documents d, sub_documents sd ' +
                    'WHERE d."parentId" = sd.id) ' +
                    'SELECT id, link, "parentId", level FROM sub_documents ORDER BY level ASC, id ASC;',
                    {replacements: { nodeId: document.id }, type: QueryTypes.SELECT, mapToModel: true });

                const documentParser = new DocumentParser();
                document.setDataValue('text', await documentParser.extract(document.link, await buildDocumentTree(documents, document.id)));
                const item = await Map.documents(document.get({ plain: true }));
                data.documents.push(item);
            }

            await this.bulkIndex(DOCUMENT_INDEX, data.documents);
        } catch (error) {
            throw error;
        }
    }

    async bulkIndex(index, data) {
        try {
            const bulkBody = data.flatMap(item => [{ index: { _index: index, _id: item.id } }, item]);

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

                console.log(`Errored documents: ${JSON.stringify(erroredDocuments)}`)
            }

            const { body: count } = await esClient.count({ index });
            console.log(`Successfully indexed ${JSON.stringify(count)} documents`);
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    async update(index, item) {
        try {
            const updateBody = { doc : item };

            const { body: updateResponse } = await esClient.update({
                index,
                id: item.id,
                body: updateBody,
                refresh: true,
            });

            if (updateResponse.errors) {
                const erroredDocuments = [];

                updateResponse.items.forEach((action, i) => {
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
            console.log(JSON.stringify(error))
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
