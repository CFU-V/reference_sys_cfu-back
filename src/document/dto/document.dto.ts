import { ApiModelProperty } from '@nestjs/swagger';

export class DocumentDto {
  @ApiModelProperty()
  title: string;
  @ApiModelProperty({required: false})
  parentId: number;
  @ApiModelProperty()
  info: string;
  @ApiModelProperty()
  type: string;
  @ApiModelProperty()
  active: boolean;
  @ApiModelProperty()
  visibility: boolean;
  @ApiModelProperty()
  renew: boolean;
}

export class UpdateDocumentDto {
  @ApiModelProperty({required: true})
  id: number;
  @ApiModelProperty({required: false})
  title: string;
  @ApiModelProperty({required: false})
  parentId: number;
  @ApiModelProperty({required: false})
  info: string;
  @ApiModelProperty({required: false})
  type: string;
  @ApiModelProperty({required: false})
  active: boolean;
  @ApiModelProperty({required: false})
  visibility: boolean;
  @ApiModelProperty({required: false})
  renew: boolean;
}

export class IndexedDocumentDto {
  id: number;
  title: string;
  info: string;
  text: string;
  type: string;
  createdAt: Date;
}
