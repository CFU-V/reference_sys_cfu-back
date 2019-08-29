import { ApiModelProperty } from '@nestjs/swagger';

export class DocumentPropertyDto {
    @ApiModelProperty({required: false})
    title: string;
    @ApiModelProperty({required: false})
    subject: string;
    @ApiModelProperty({required: false})
    creator: string;
    @ApiModelProperty({required: false})
    keywords: string;
    @ApiModelProperty({required: false})
    lastModifiedBy: string;
    @ApiModelProperty({required: false})
    revision: string;
    @ApiModelProperty({required: false})
    createdAt: string;
    @ApiModelProperty({required: false})
    updatedAt: string;
}
