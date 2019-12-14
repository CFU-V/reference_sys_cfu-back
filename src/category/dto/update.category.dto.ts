import { ApiModelProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
    @ApiModelProperty()
    id: number;
    @ApiModelProperty()
    title: string;
}
