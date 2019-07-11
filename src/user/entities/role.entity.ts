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
    HasMany,
} from 'sequelize-typescript';
import { User } from './user.entity';

@Table({
    timestamps: false,
    underscored: false,
    tableName: 'roles',
})

export class Role extends Model<Role> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @AllowNull(false)
    @Unique
    @Column({type: DataType.STRING(25)})
    name: string;

    @AllowNull(false)
    @Column({type: DataType.STRING(256)})
    remark: string;

    @HasMany(() => User)
    users: User[];
}
