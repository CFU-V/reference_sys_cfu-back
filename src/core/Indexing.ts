import { Map } from '../search/search.map';
import { Document } from "../document/entities/document.entity";
import DocumentParser from "../document/document.parser";
import {DOCUMENT_INDEX} from "../common/constants";
const { Client } = require('@elastic/elasticsearch');
const esClient = new Client({ node: process.env.ELASTIC_URI });

export class Indexing {
    constructor(private readonly documentRepository: typeof Document) {}

    async _do() {
        let data = {
            documents: [],
        };

        let documents = await this.documentRepository.findAll({where: {parentId: null}});

        for (let document of documents) {
            const documentParser = new DocumentParser(this.documentRepository, document);
            document.setDataValue('text', await documentParser.format());

            let item = await Map.documents(document);

            data.documents.push(item);
        }

        this.bulkIndex(DOCUMENT_INDEX, data.documents);
    }

    bulkIndex(index, data) {
        let bulkBody = [];

        data.forEach(item => {
            bulkBody.push({
                index: {
                    _index: index,
                    _id: item.id
                }
            });

            bulkBody.push(item);
        });


        esClient.bulk({body: bulkBody})
            .then(response => {
                let errorCount = 0;
                response.items.forEach(item => {
                    if (item.index && item.index.error) {
                        console.log(++errorCount, item.index.error);
                    }
                });
                console.log(
                    `Successfully indexed ${data.length - errorCount}
                    out of ${data.length} items`
                );
            })
            .catch(error => console.log(error));
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
