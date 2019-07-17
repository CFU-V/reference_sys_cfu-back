import { ApiModelProperty } from '@nestjs/swagger';

export class MeDto {
  @ApiModelProperty()
  password: string;
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
