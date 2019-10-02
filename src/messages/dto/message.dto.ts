import { ApiModelProperty } from '@nestjs/swagger';

export class MessageDto {
    @ApiModelProperty()
    text: string;
    @ApiModelProperty()
    authorId: number;
    @ApiModelProperty()
    recipientId: string;
}
