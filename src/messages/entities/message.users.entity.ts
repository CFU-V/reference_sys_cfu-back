import {
    Table,
    Model,
    Column,
    ForeignKey, DataType, BelongsTo,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { Message } from './message.entity';

@Table({
    timestamps: true,
    underscored: false,
    tableName: 'userMessage',
    indexes: [{
        unique: true,
        name: 'message',
        fields: [
            'messageId',
            'recipientId',
        ],
    }],
})

export class UserMessage extends Model<UserMessage> {
    @ForeignKey(() => Message)
    @Column({
        unique: 'message',
        type: DataType.BIGINT,
    })
    messageId: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.BIGINT })
    recipientId: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isRead: boolean;

    @BelongsTo(() => Message)
    message: Message;

    @BelongsTo(() => User)
    recipient: User;
}
