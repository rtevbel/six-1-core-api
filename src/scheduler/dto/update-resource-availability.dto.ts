import { PartialType } from '@nestjs/mapped-types';
import { CreateResourceAvailabilityDto } from './create-resource-availability.dto';

export class UpdateResourceAvailabilityDto extends PartialType(
  CreateResourceAvailabilityDto,
) {}
