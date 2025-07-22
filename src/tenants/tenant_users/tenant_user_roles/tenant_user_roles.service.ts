import { Injectable } from '@nestjs/common';
import { CreateTenantUserRoleDto } from './dto/create-tenant_user_role.dto';
import { UpdateTenantUserRoleDto } from './dto/update-tenant_user_role.dto';

@Injectable()
export class TenantUserRolesService {
  create(createTenantUserRoleDto: CreateTenantUserRoleDto) {
    return 'This action adds a new tenantUserRole';
  }

  findAll() {
    return `This action returns all tenantUserRoles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tenantUserRole`;
  }

  update(id: number, updateTenantUserRoleDto: UpdateTenantUserRoleDto) {
    return `This action updates a #${id} tenantUserRole`;
  }

  remove(id: number) {
    return `This action removes a #${id} tenantUserRole`;
  }
}
