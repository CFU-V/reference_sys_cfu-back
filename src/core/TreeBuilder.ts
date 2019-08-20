import {Document} from '../document/entities/document.entity';
import {DocumentRecursiveDto, DocumentTreeDto} from "../document/dto/document.tree.dto";

/**
 * Helper for build tree of documents
 * @param documents - array of all documents.
 * @returns {Promise<any>}
 */

export async function buildDocumentTree(documents: any, id?: number) : Promise<DocumentTreeDto> {
    try {
        let map = {}, node, categoryTree: Array<DocumentTreeDto> = [];

        for (let i = 0; i < documents.length; i++) {
            map[documents[i].id] = i;
            documents[i].childrens = [];
        }

        for (let i = 0; i < documents.length; i++) {
            node = documents[i];
            if (node.parentId) {
                documents[map[node.parentId]] ? documents[map[node.parentId]].childrens.push(node) : categoryTree.push(node);
            } else {
                categoryTree.push(node);
            }
        }

        return documents[map[id]]//return categories[map[await getTopParentId(categories, map, id)]]
    } catch (error) {
        return error;
    }
}

async function getTopParentId(categories, map, id: number) {
    if (categories[map[id]].parentId) {
        return getTopParentId(categories, map, categories[map[id]].parentId)
    } else {
        return id
    }
}
