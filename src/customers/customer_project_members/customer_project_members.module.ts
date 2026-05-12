import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerProjectMembersService } from './customer_project_members.service';
import { CustomerProjectMembersController } from './customer_project_members.controller';
import { CustomerProjectMemberEntity } from './entities/customer_project_member.entity';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerProjectMemberEntity]),
    ConfigObjectsModule,
  ],
  controllers: [CustomerProjectMembersController],
  providers: [CustomerProjectMembersService],
  exports: [CustomerProjectMembersService],
})
export class CustomerProjectMembersModule {}
