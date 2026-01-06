import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerEntity } from './entities/customer.entity';
import { CustomerContactInfoModule } from './customer_contact_info/customer_contact_info.module';
import { CustomerInvitationsModule } from './customer_invitations/customer_invitations.module';
import { CustomerProjectMembersModule } from './customer_project_members/customer_project_members.module';
import { CustomerTaskMembersModule } from './customer_task_members/customer_task_members.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerEntity]),
    CustomerContactInfoModule,
    CustomerInvitationsModule,
    CustomerProjectMembersModule,
    CustomerTaskMembersModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
