import { ApiModelProperty } from '@nestjs/swagger';

export class MeDto {
  @ApiModelProperty({required: false})
  login: string;
  @ApiModelProperty({required: false})
  password: string;
  @ApiModelProperty({required: false})
  phone: string;
  @ApiModelProperty({required: false})
  lastName: string;
  @ApiModelProperty({required: false})
  firstName: string;
  @ApiModelProperty({required: false})
  surName: string;
  @ApiModelProperty({required: false})
  position: string;
}
