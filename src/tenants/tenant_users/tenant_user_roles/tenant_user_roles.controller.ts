import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantUserRolesService } from './tenant_user_roles.service';
import { CreateTenantUserRoleDto } from './dto/create-tenant_user_role.dto';
import { UpdateTenantUserRoleDto } from './dto/update-tenant_user_role.dto';

@Controller()
export class TenantUserRolesController {
  constructor(
    private readonly tenantUserRolesService: TenantUserRolesService,
  ) {}

  @MessagePattern('createTenantUserRole')
  create(@Payload() createTenantUserRoleDto: CreateTenantUserRoleDto) {
    return this.tenantUserRolesService.create(createTenantUserRoleDto);
  }

  @MessagePattern('findAllTenantUserRoles')
  findAll() {
    return this.tenantUserRolesService.findAll();
  }

  @MessagePattern('findOneTenantUserRole')
  findOne(@Payload() id: number) {
    return this.tenantUserRolesService.findOne(id);
  }

  @MessagePattern('updateTenantUserRole')
  update(@Payload() updateTenantUserRoleDto: UpdateTenantUserRoleDto) {
    return this.tenantUserRolesService.update(
      updateTenantUserRoleDto.id,
      updateTenantUserRoleDto,
    );
  }

  @MessagePattern('removeTenantUserRole')
  remove(@Payload() id: number) {
    return this.tenantUserRolesService.remove(id);
  }
}
