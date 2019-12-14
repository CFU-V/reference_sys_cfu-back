import { ApiModelProperty } from '@nestjs/swagger';

export class CategoryDto {
    @ApiModelProperty()
    title: string;
}
