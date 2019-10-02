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
    BelongsTo,
    BelongsToMany,
    BeforeUpdate,
    BeforeCreate,
    BeforeDestroy,
    AfterCreate,
    AfterUpdate,
    HasMany,
    HasOne,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';

@Table({
    timestamps: true,
    underscored: false,
    tableName: 'documents',
})

export class Message extends Model<Message> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(6000),
    })
    text: string;

    @ForeignKey(() => User)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
    })
    authorId: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.BIGINT,
        allowNull: true,
    })
    recipientId: number;

    @BelongsTo(() => User, { onDelete: 'CASCADE' })
    author: User;

    @BelongsTo(() => User, { onDelete: 'CASCADE' })
    recipient: User;
}
