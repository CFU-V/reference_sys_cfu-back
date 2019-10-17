import { ApiModelProperty } from '@nestjs/swagger';

export class IFieldQuery {
    @ApiModelProperty()
    field: string;
    @ApiModelProperty()
    query: string;
}
