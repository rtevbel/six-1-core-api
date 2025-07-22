import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantUserRoleDto } from './create-tenant_user_role.dto';

export class UpdateTenantUserRoleDto extends PartialType(
  CreateTenantUserRoleDto,
) {
  id!: number;
}
