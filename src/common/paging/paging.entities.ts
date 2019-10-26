import { Pagination } from './paging.interface';
import { PAGE_SIZE, PAGE } from './paging.constants';

export class EntitiesWithPaging implements Pagination {
    private _entities: Array<any> = null;
    private _currentPage: number;
    private _pageSize?: number;
    private _totalItems?: number;

    constructor(entities: Array<any>, count: number, page: number, pageSize: number ) {
        this._entities = entities;
        this._pageSize = pageSize > 0 ? pageSize : PAGE_SIZE;
        this._currentPage = page > 0 ? page : PAGE;
        this._totalItems = count;
    }

    public get entities(): Array<any> {
        return this._entities;
    }

    public get pageSize(): number {
        return this._pageSize;
    }

    public get currentPage(): number {
        return this._currentPage;
    }

    public get totalItems(): number {
        return this._totalItems;
    }

    public toJSON(): object {
        const pages = Math.ceil(this._totalItems / this._pageSize);
        return {
            items: this._entities,
            total: this._totalItems,
            page: this._currentPage,
            pageSize: this._pageSize,
            pages,
        };
    }
}
