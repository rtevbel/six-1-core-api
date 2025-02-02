import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { RoleEntity } from './entities/role.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { RoleDescriptionEntity } from './entities/role-description.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, RolePermissionEntity, RoleDescriptionEntity])],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
