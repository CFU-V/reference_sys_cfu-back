import { ApiModelProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';

export class GetUsersResponseDto {
  @ApiModelProperty()
  users: [UserDto];
}
