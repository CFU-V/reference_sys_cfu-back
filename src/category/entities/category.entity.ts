import {
    Table,
    Model,
    Column,
    DataType,
    AllowNull,
    PrimaryKey,
    AutoIncrement, CreatedAt, Default, UpdatedAt,
} from 'sequelize-typescript';

@Table({
    timestamps: true,
    underscored: false,
    tableName: 'categories',
})

export class Category extends Model<Category> {
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
}
