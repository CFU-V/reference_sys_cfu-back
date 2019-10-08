import { IMergedDocument } from '../../interfaces/merged.document.interface';

export default class DocumentMerger {
    public async load(xml: string, links: string): Promise<void>;
    public async start(xmlFiles: string[], xmlLinks: string[]): Promise<IMergedDocument>;
}
