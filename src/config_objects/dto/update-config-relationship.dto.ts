import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateConfigRelationshipDto } from './create-config-relationship.dto';

/**
 * Update DTO for configuration relationships.
 *
 * Extends the create DTO as a partial while preventing changes to the
 * identity fields (fromObjectType/toObjectType/relationshipKey), and adds
 * identifiers needed to update an existing relationship row. For tenant-level
 * configuration `tenantId` should be provided; for system-level configuration
 * it may be omitted and derived from context.
 */
export class UpdateConfigRelationshipDto extends PartialType(
  OmitType(CreateConfigRelationshipDto, ['tenantId', 'createdBy', 'fromObjectType', 'toObjectType', 'relationshipKey'] as const),
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
  configObjectRelationshipId!: number;
}

