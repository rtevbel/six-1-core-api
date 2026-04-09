import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateLifecycleDto } from './create-lifecycle.dto';

/**
 * Update DTO for lifecycle states.
 *
 * Extends the create DTO as a partial while preventing changes to the
 * identity fields (objectType/stateKey), and adds identifiers needed
 * to update an existing lifecycle row. For tenant-level configuration
 * `tenantId` should be provided; for system-level configuration it may be
 * omitted and derived from context.
 */
export class UpdateLifecycleDto extends PartialType(
  OmitType(CreateLifecycleDto, [
    'tenantId',
    'configTemplateSetId',
    'createdBy',
    'objectType',
    'stateKey',
  ] as const),
) {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;

  @IsInt()
  @Min(1)
  configObjectLifecycleId!: number;
}

