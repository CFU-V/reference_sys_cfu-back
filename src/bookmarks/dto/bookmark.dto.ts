import { ApiModelProperty } from '@nestjs/swagger';

export class BookmarkDto {
    @ApiModelProperty({required: true})
    docId: number;
    @ApiModelProperty({required: false})
    control: boolean;
}
