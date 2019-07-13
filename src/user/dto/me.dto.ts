import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MeDto {
  @ApiModelProperty()
  @IsString()
  password: string;
  @ApiModelProperty()
  @IsString()
  phone: string;
  @ApiModelProperty()
  @IsString()
  lastName: string;
  @ApiModelProperty()
  @IsString()
  firstName: string;
  @ApiModelProperty()
  @IsString()
  surName: string;
  @ApiModelProperty()
  @IsString()
  position: string;
}
