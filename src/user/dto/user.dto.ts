import { ApiModelProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class UserDto {
  @ApiModelProperty()
  @IsNumber()
  id: number;
  @ApiModelProperty()
  @IsString()
  password: string;
  @ApiModelProperty()
  @IsNumber()
  roleId: number;
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
