import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateLifecycleTransitionDto } from './create-lifecycle-transition.dto';

/**
 * Update DTO for lifecycle transitions.
 *
 * Extends the create DTO as a partial while preventing changes to the
 * identity fields (objectType/fromStateKey/toStateKey), and adds identifiers
 * needed to update an existing transition row. For tenant-level configuration
 * `tenantId` should be provided; for system-level configuration it may be
 * omitted and derived from context.
 */
export class UpdateLifecycleTransitionDto extends PartialType(
  OmitType(CreateLifecycleTransitionDto, [
    'tenantId',
    'configTemplateSetId',
    'createdBy',
    'objectType',
    'fromStateKey',
    'toStateKey',
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
  configObjectLifecycleTransitionId!: number;
}

