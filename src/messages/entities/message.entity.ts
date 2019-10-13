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
    BelongsToMany,
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

    @BelongsToMany(() => User, () => UserMessage)
    recipients: User[];
}
