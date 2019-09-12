import {
    Table,
    Model,
    Column,
    DataType,
    Default,
    Unique,
    AllowNull,
    PrimaryKey,
    AutoIncrement,
    HasMany, ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { Document } from '../../document/entities/document.entity';

@Table({
    timestamps: false,
    underscored: false,
    tableName: 'bookmarks',
})

export class Bookmark extends Model<Bookmark> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @AllowNull(false)
    @PrimaryKey
    @ForeignKey(() => User)
    @Column({type: DataType.BIGINT})
    userId: number;

    @AllowNull(false)
    @PrimaryKey
    @ForeignKey(() => Document)
    @Column({type: DataType.BIGINT})
    docId: number;

    @AllowNull(false)
    @Default(false)
    @Column({type: DataType.BOOLEAN})
    control: boolean;

    @BelongsTo(() => Document, { onDelete: 'CASCADE' })
    document: Document;

    @BelongsTo(() => User, { onDelete: 'CASCADE' })
    user: User;
}
