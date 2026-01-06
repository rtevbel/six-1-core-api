import { PartialType } from '@nestjs/mapped-types';
import { CreateResourceAssignmentDto } from './create-resource-assignment.dto';

export class UpdateResourceAssignmentDto extends PartialType(
  CreateResourceAssignmentDto,
) {}
