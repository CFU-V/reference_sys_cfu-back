import {
    Table,
    Model,
    Column,
    DataType,
    Default,
    AllowNull,
    CreatedAt,
    UpdatedAt,
    PrimaryKey,
    ForeignKey,
    AutoIncrement,
    BelongsTo, BelongsToMany, BeforeUpdate, BeforeCreate, BeforeDestroy, AfterCreate,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { Category } from "./category.entity";
import { SearchIndexing } from "../../search/search.indexing";
import {DOCUMENT_INDEX} from "../../common/constants";
import {Map} from "../../search/search.map";
import DocumentParser from "../document.parser";

@Table({
    timestamps: true,
    underscored: false,
    tableName: 'documents',
})

export class Document extends Model<Document> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(256),
        unique: true,
    })
    title: string;

    @AllowNull(false)
    @Column({type: DataType.STRING(6000)})
    info: string;

    @ForeignKey(() => Category)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    categoryId: number;

    @AllowNull(false)
    @Default(true)
    @Column({type: DataType.BOOLEAN})
    active: boolean;

    @AllowNull(false)
    @Default(true)
    @Column({type: DataType.BOOLEAN})
    visibility: boolean;

    @AllowNull(false)
    @Column({type: DataType.STRING(1024)})
    link: string;

    @AllowNull(true)
    @Column({type: DataType.STRING(1024)})
    consultant_link: string;

    @AllowNull(true)
    @Default(false)
    @Column({type: DataType.BOOLEAN})
    renew: boolean;

    @CreatedAt
    @Default(DataType.NOW)
    @Column({type: DataType.DATE})
    createdAt: Date;

    @UpdatedAt
    @Default(DataType.NOW)
    @Column({type: DataType.DATE, onUpdate: 'SET DEFAULT'})
    updatedAt: Date;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER(),
        allowNull: false,
    })
    ownerId: number;

    @BelongsTo(() => User)
    owner: User;

    @ForeignKey(() => Document)
    @Column({
        type: DataType.BIGINT,
        allowNull: true,
    })
    parentId: number;

    @BelongsTo(() => Document)
    parent: Document;

    @BelongsTo(() => Category)
    category: Category;

    @BeforeUpdate
    @AfterCreate
    static async _indexing(document: Document) {
        try {
            const searchIndexing = new SearchIndexing(Document);
            if (!document.parentId) {
                await searchIndexing.bulkIndex(DOCUMENT_INDEX, [await this.getDocumentData(document.id)]);
            } else {
                await searchIndexing.deleteIfExist(DOCUMENT_INDEX, document.id);
                await searchIndexing.update(DOCUMENT_INDEX, await this.getDocumentData(document.parentId))
            }
        } catch (error) {
            console.log(error);
        }
    }

    @BeforeDestroy
    static async _deleteIndex(document: Document) {
        try {
            const searchIndexing = new SearchIndexing(Document);
            await searchIndexing.deleteIfExist(DOCUMENT_INDEX, document.id);
        } catch (error) {
            console.log(error);
        }
    }

    static async getDocumentData(id: number) {
        try {
            const doc = await this.findOne({
                where: { id },
                include: [{model: Category, as: 'category', attributes: ['title']}]
            });

            const documentParser = new DocumentParser(Document, doc);
            doc.setDataValue('text', await documentParser.extract());

            return await Map.documents(doc.get({ plain: true }));
        } catch (error) {
            console.log(error);
        }
    }
}
