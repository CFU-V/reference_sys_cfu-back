import { ApiModelProperty } from '@nestjs/swagger';

export class CompareDataDto {
    @ApiModelProperty()
    sourceId: number;
    @ApiModelProperty()
    compareId: number;
    @ApiModelProperty()
    page: number;
}
