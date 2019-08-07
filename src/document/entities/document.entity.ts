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
    BelongsTo, BelongsToMany,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import {Category} from "./category.entity";

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
}
