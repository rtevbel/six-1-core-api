import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { PermissionDescription } from './entities/permission-description.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, PermissionDescription])],
  controllers: [PermissionsController],
  providers: [PermissionsService],
})
export class PermissionsModule {}
