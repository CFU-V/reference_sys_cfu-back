import { ApiModelProperty } from '@nestjs/swagger';

export class RegistrationDTO {
  @ApiModelProperty()
  login: string;
  @ApiModelProperty()
  password: string;
  @ApiModelProperty()
  roleId: number;
  @ApiModelProperty()
  lastName: string;
  @ApiModelProperty()
  firstName: string;
  @ApiModelProperty()
  surName: string;
  @ApiModelProperty()
  email: string;
  @ApiModelProperty()
  birthDate: Date;
  @ApiModelProperty()
  position: string;
  @ApiModelProperty()
  phone: string;
}
