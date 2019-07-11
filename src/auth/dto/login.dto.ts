import { ApiModelProperty } from '@nestjs/swagger';

export class LoginDTO {
  @ApiModelProperty()
  login: string;
  @ApiModelProperty()
  password: string;
}
