import { PartialType } from '@nestjs/mapped-types';
import { CreateSharedProjectDto } from './create-shared-project.dto';

export class UpdateSharedProjectDto extends PartialType(
  CreateSharedProjectDto,
) {}
