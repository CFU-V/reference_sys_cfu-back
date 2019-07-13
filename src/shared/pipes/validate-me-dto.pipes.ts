import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ValidateMeDtoPipes implements PipeTransform<string> {
    async transform(value: any, metadata: ArgumentMetadata) {
        return {
            password: value.password,
            phone: value.phone,
            lastName: value.lastName,
            firstName: value.firstName,
            surName: value.surName,
            position: value.position,
        };
    }
}
