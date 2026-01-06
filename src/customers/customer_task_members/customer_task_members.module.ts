import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerTaskMembersService } from './customer_task_members.service';
import { CustomerTaskMembersController } from './customer_task_members.controller';
import { CustomerTaskMemberEntity } from './entities/customer_task_member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerTaskMemberEntity])],
  controllers: [CustomerTaskMembersController],
  providers: [CustomerTaskMembersService],
  exports: [CustomerTaskMembersService],
})
export class CustomerTaskMembersModule {}
