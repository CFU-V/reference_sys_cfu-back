import { ApiModelProperty } from '@nestjs/swagger';

export class MessageDto {
    @ApiModelProperty({ required: true })
    text: string;
    @ApiModelProperty({ description: 'Ids array of recipients', required: true, type: [Number] })
    recipients: number[];
    authorId: number;
}
