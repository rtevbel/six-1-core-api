import { Module } from '@nestjs/common';
import { TenantTeamMemberService } from './tenant_team_members.service';
import { TenantTeamMemberController } from './tenant_team_members.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantTeamMemberEntity } from './entities/tenant_team_member.entity';

/**
 * TenantTeamMembersModule is responsible for managing tenant team members.
 * It includes the controller and service for handling operations related to tenant team members
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantTeamMemberEntity]),
  ],
  controllers: [TenantTeamMemberController],
  providers: [TenantTeamMemberService],
})
export class TenantTeamMembersModule {}
