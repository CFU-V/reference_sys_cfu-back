import { ApiModelProperty } from '@nestjs/swagger';

export class CredentialDto {
    @ApiModelProperty({required: false})
    password: string;
}
