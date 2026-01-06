import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerProjectMembersService } from './customer_project_members.service';
import { CustomerProjectMembersController } from './customer_project_members.controller';
import { CustomerProjectMemberEntity } from './entities/customer_project_member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerProjectMemberEntity])],
  controllers: [CustomerProjectMembersController],
  providers: [CustomerProjectMembersService],
  exports: [CustomerProjectMembersService],
})
export class CustomerProjectMembersModule {}
