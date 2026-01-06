import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerInvitationsService } from './customer_invitations.service';
import { CustomerInvitationsController } from './customer_invitations.controller';
import { CustomerInvitationEntity } from './entities/customer_invitation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerInvitationEntity])],
  controllers: [CustomerInvitationsController],
  providers: [CustomerInvitationsService],
  exports: [CustomerInvitationsService],
})
export class CustomerInvitationsModule {}
