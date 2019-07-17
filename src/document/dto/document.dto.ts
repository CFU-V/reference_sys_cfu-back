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
  @ApiModelProperty()
  id: string;
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
