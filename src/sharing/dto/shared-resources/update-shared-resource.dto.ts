import { PartialType } from '@nestjs/mapped-types';
import { CreateSharedResourceDto } from './create-shared-resource.dto';

export class UpdateSharedResourceDto extends PartialType(
  CreateSharedResourceDto,
) {}
