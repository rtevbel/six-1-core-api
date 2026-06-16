import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { AuthorizationService } from '../authorization/authorization.service';
import { normalizeRequiredPermissions } from '../automation/process-step-permissions.util';
import { PROCESS_STEP_PERMISSIONS_NOT_MET_MESSAGE } from '../common/constants';
import { ProcessInstanceStepEntity } from './process_instance_steps/entities/process_instance_step.entity';

@Injectable()
export class ProcessStepPermissionService {
  constructor(
    @InjectRepository(ProcessInstanceStepEntity)
    private readonly stepRepository: Repository<ProcessInstanceStepEntity>,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /**
   * Returns whether the caller satisfies the given permission keys.
   */
  async callerHasRequiredPermissions(
    userId: number,
    requiredPermissions: string[],
    tenantUserId?: number,
  ): Promise<boolean> {
    if (requiredPermissions.length === 0) {
      return true;
    }

    return this.authorizationService.hasPermissions(
      userId,
      requiredPermissions,
      tenantUserId,
    );
  }

  /**
   * Returns whether the caller satisfies the step's required permission keys.
   * Empty requirements always pass.
   */
  async callerCanCompleteStep(
    userId: number,
    stepInstanceId: number,
    tenantUserId?: number,
  ): Promise<boolean> {
    const required = await this.loadRequiredPermissions(stepInstanceId);
    if (required.length === 0) {
      return true;
    }

    return this.authorizationService.hasPermissions(
      userId,
      required,
      tenantUserId,
    );
  }

  /**
   * Enforces step-level permissions before manual completion (E1).
   */
  async assertCallerCanCompleteStep(
    userId: number,
    stepInstanceId: number,
    tenantUserId?: number,
  ): Promise<void> {
    const allowed = await this.callerCanCompleteStep(
      userId,
      stepInstanceId,
      tenantUserId,
    );
    if (!allowed) {
      throw new RpcException(PROCESS_STEP_PERMISSIONS_NOT_MET_MESSAGE);
    }
  }

  async loadRequiredPermissions(stepInstanceId: number): Promise<string[]> {
    const step = await this.stepRepository.findOne({
      where: { stepInstanceId },
      select: ['stepInstanceId', 'requiredPermissions'],
    });

    if (!step) {
      return [];
    }

    return normalizeRequiredPermissions(step.requiredPermissions);
  }
}
