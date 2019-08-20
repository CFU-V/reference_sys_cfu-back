import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MeDto {
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
