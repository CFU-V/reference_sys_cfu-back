import { ApiModelProperty } from '@nestjs/swagger';
import { IFieldQuery } from './field.query.interface';

export class SearchByFieldDto {
    @ApiModelProperty()
    from: number;
    @ApiModelProperty()
    to: number;
    @ApiModelProperty()
    content: string;
    @ApiModelProperty({ type: [IFieldQuery] })
    fieldsQuery: IFieldQuery[];
}
