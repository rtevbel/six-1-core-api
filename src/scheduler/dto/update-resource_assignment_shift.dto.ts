import { PartialType } from '@nestjs/mapped-types';
import { CreateResourceAssignmentShiftDto } from './create-resource_assignment_shift.dto';

export class UpdateResourceAssignmentShiftDto extends PartialType(
  CreateResourceAssignmentShiftDto,
) {}
