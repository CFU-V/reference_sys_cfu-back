import { ApiModelProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiModelProperty()
  id: number;
  @ApiModelProperty()
  password: string;
  @ApiModelProperty()
  roleId: number;
  @ApiModelProperty()
  phone: string;
  @ApiModelProperty()
  lastName: string;
  @ApiModelProperty()
  firstName: string;
  @ApiModelProperty()
  surName: string;
  @ApiModelProperty()
  position: string;
}
