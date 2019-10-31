import { ApiModelProperty } from '@nestjs/swagger';
import { IFieldQuery } from './field.query.interface';

export class SearchByFieldDto {
    @ApiModelProperty()
    page: number;
    @ApiModelProperty()
    pageSize: number;
    @ApiModelProperty()
    content: string;
    @ApiModelProperty({ type: [IFieldQuery] })
    fieldsQuery: IFieldQuery[];
}
