import { ApiModelProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiModelProperty()
  id: number;
  @ApiModelProperty()
  login: string;
  @ApiModelProperty()
  password: string;
  @ApiModelProperty()
  token: string;
  @ApiModelProperty()
  role: any;
}
