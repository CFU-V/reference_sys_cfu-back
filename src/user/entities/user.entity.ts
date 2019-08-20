import {
    Table,
    Model,
    Column,
    DataType,
    Default,
    Unique,
    AllowNull,
    CreatedAt,
    UpdatedAt,
    PrimaryKey,
    ForeignKey,
    AutoIncrement,
    BelongsTo,
    BeforeCreate,
    BeforeUpdate,
} from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';
import { Role } from './role.entity';

@Table({
    timestamps: true,
    underscored: false,
    tableName: 'users',
})

export class User extends Model<User> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(25),
        unique: true,
    })
    login: string;

    @AllowNull(false)
    @Column({type: DataType.STRING(256)})
    password: string;

    @AllowNull(false)
    @Column({type: DataType.STRING(30)})
    lastName: string;

    @AllowNull(false)
    @Column({type: DataType.STRING(30)})
    firstName: string;

    @AllowNull(false)
    @Column({type: DataType.STRING(50)})
    surName: string;

    @AllowNull(false)
    @Column({type: DataType.DATE})
    birthDate: Date;

    @AllowNull(false)
    @Column({type: DataType.STRING(100)})
    position: string;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(256),
        validate: { isEmail: { msg: 'Incorrect email' } },
    })
    email: string;

    @AllowNull(false)
    @Unique
    @Column({type: DataType.STRING(50)})
    phone: string;

    @CreatedAt
    @Default(DataType.NOW)
    @Column({type: DataType.DATE})
    createdAt: Date;

    @UpdatedAt
    @Default(DataType.NOW)
    @Column({type: DataType.DATE, onUpdate: 'SET DEFAULT'})
    updatedAt: Date;

    @ForeignKey(() => Role)
    @Column({
        type: DataType.INTEGER(),
        allowNull: false,
    })
    roleId: number;

    @BelongsTo(() => Role)
    role: Role;

    @BeforeUpdate
    @BeforeCreate
    static async hashPassword(user: User) {
        try {
            if (user.password !== user.previous('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        } catch (error) {
            throw error;
        }
    }
}
