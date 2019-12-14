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

    @CreatedAt
    @Default(DataType.NOW)
    @Column({type: DataType.DATE})
    createdAt: Date;

    @UpdatedAt
    @Default(DataType.NOW)
    @Column({type: DataType.DATE, onUpdate: 'SET DEFAULT'})
    updatedAt: Date;
}
