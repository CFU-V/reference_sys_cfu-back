import { ApiModelProperty } from '@nestjs/swagger';

export class DocumentSrhareDto {
    @ApiModelProperty()
    documentId: number;
    @ApiModelProperty()
    recipientMail: string;
    @ApiModelProperty({required: false})
    message: string;
}
