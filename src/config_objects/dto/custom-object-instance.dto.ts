import { IsIn, IsInt, IsObject, IsOptional, Min } from 'class-validator';
import { ConfigCustomObjectInstanceStatus } from '../entities/config_custom_object_instance.entity';

/**
 * List standalone instances for a tenant and config object definition.
 */
export class ListCustomObjectInstancesDto {
  @IsInt()
  @Min(1)
  tenantId!: number;

  @IsInt()
  @Min(1)
  configObjectId!: number;

  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: ConfigCustomObjectInstanceStatus;
}

/**
 * Fetch one standalone instance by id, scoped to tenant.
 */
export class GetCustomObjectInstanceDto {
  @IsInt()
  @Min(1)
  tenantId!: number;

  @IsInt()
  @Min(1)
  configCustomObjectInstanceId!: number;
}

/**
 * Create a row in `config_custom_object_instances` (standalone config objects only).
 */
export class CreateCustomObjectInstanceDto {
  @IsInt()
  @Min(1)
  tenantId!: number;

  @IsInt()
  @Min(1)
  configObjectId!: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: ConfigCustomObjectInstanceStatus;
}

/**
 * Update payload and/or status for a standalone instance.
 */
export class UpdateCustomObjectInstanceDto {
  @IsInt()
  @Min(1)
  tenantId!: number;

  @IsInt()
  @Min(1)
  configCustomObjectInstanceId!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  updatedBy?: number;

  /**
   * When this instance is bound to a process step (Object Runner),
   * step mutation is guarded by collaboration locks (G3).
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  tenantUserId?: number;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: ConfigCustomObjectInstanceStatus;
}

/**
 * Delete a standalone instance row.
 */
export class DeleteCustomObjectInstanceDto {
  @IsInt()
  @Min(1)
  tenantId!: number;

  @IsInt()
  @Min(1)
  deletedBy!: number;

  @IsInt()
  @Min(1)
  configCustomObjectInstanceId!: number;
}
