import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformActionDto } from './create-platform_action.dto';

export class UpdatePlatformActionDto extends PartialType(
  CreatePlatformActionDto,
) {}
