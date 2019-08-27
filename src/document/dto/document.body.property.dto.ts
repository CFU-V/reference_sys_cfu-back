import { DocumentPropertyDto } from './document.property.dto';
import { ApiModelProperty } from '@nestjs/swagger';

export class BodyDocumentPropertyDto {
    @ApiModelProperty()
    id: number;
    @ApiModelProperty()
    props: DocumentPropertyDto;
}
