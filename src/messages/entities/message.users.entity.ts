import {
    Table,
    Model,
    Column,
    ForeignKey,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { Message } from './message.entity';

@Table({
    timestamps: true,
    underscored: false,
    tableName: 'userMessage',
})

export class UserMessage extends Model<UserMessage> {
    @ForeignKey(() => Message)
    @Column
    messageId: number;

    @ForeignKey(() => User)
    @Column
    recipientId: number;
}
