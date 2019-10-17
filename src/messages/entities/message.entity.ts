import {
    Table,
    Model,
    Column,
    DataType,
    AllowNull,
    PrimaryKey,
    ForeignKey,
    AutoIncrement,
    BelongsTo,
    BelongsToMany, CreatedAt, Default, UpdatedAt,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { UserMessage } from './message.users.entity';

@Table({
    timestamps: true,
    underscored: false,
    tableName: 'messages',
})

export class Message extends Model<Message> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(20000),
    })
    text: string;

    @ForeignKey(() => User)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
    })
    authorId: number;

    @CreatedAt
    @Default(DataType.NOW)
    @Column({type: DataType.DATE})
    createdAt: Date;

    @UpdatedAt
    @Default(DataType.NOW)
    @Column({type: DataType.DATE, onUpdate: 'SET DEFAULT'})
    updatedAt: Date;

    @BelongsTo(() => User, { onDelete: 'CASCADE' })
    author: User;

    @BelongsToMany(() => User, () => UserMessage)
    recipients: User[];
}
