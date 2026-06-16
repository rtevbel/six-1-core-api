import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessInstancesService } from './process_instances.service';
import { ProcessRunnerService } from './process-runner.service';
import type { ProcessRunnerPayload } from './interfaces/process-runner-payload.interface';
import type { ProcessInstanceTimelineResult } from './interfaces/process-instance-timeline.interface';
import type { ProcessStepExecutionLogResult } from './interfaces/process-step-execution-log.interface';
import { CreateProcessInstanceDto } from './dto/create-process_instance.dto';
import { UpdateProcessInstanceDto } from './dto/update-process_instance.dto';
import { FiltersDto } from './dto/filters.dto';
import { GetProcessInstanceRunnerDto } from './dto/get-process-instance-runner.dto';
import { GetProcessInstanceTimelineDto } from './dto/get-process-instance-timeline.dto';
import { GetProcessInstanceStepExecutionLogDto } from './dto/get-process-instance-step-execution-log.dto';
import { StartProcessDto } from './dto/start-process.dto';
import { BatchStartProcessDto } from './dto/batch-start-process.dto';
import {
  AcquireProcessStepLockDto,
  HeartbeatProcessStepLockDto,
  ReleaseProcessStepLockDto,
} from './dto/step-lock.dto';
import { CompleteProcessInstanceStepDto } from './dto/complete-process-instance-step.dto';
import { SkipProcessInstanceStepDto } from './dto/skip-process-instance-step.dto';
import { RetryProcessInstanceStepDto } from './dto/retry-process-instance-step.dto';
import { RollbackProcessInstanceStepDto } from './dto/rollback-process-instance-step.dto';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RequirePermissions } from '../authorization/authorization.decorator';

import {
  MICROSERVICE_CREATE_PROCESS_INSTANCE_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_INSTANCE_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_INSTANCE_PATTERN,
  MICROSERVICE_GET_PROCESS_INSTANCE_RUNNER_PATTERN,
  MICROSERVICE_GET_PROCESS_INSTANCE_TIMELINE_PATTERN,
  MICROSERVICE_GET_PROCESS_INSTANCE_STEP_EXECUTION_LOG_PATTERN,
  MICROSERVICE_START_PROCESS_PATTERN,
  MICROSERVICE_BATCH_START_PROCESS_PATTERN,
  MICROSERVICE_ACQUIRE_PROCESS_STEP_LOCK_PATTERN,
  MICROSERVICE_RELEASE_PROCESS_STEP_LOCK_PATTERN,
  MICROSERVICE_HEARTBEAT_PROCESS_STEP_LOCK_PATTERN,
  MICROSERVICE_COMPLETE_PROCESS_INSTANCE_STEP_PATTERN,
  MICROSERVICE_SKIP_PROCESS_INSTANCE_STEP_PATTERN,
  MICROSERVICE_RETRY_PROCESS_INSTANCE_STEP_PATTERN,
  MICROSERVICE_ROLLBACK_PROCESS_INSTANCE_STEP_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { resolveProcessTemplateStoredTenantId } from '../common/utils/tenant-scope.util';
import { ProcessLifecycleFacade } from '../automation/process-lifecycle.facade';
import { StepOrchestratorService } from '../automation/step-orchestrator.service';
import { ProcessStepPermissionService } from './process-step-permission.service';
import { ProcessInstanceTimelineService } from './process-instance-timeline.service';
import { ProcessStepExecutionLogService } from '../automation/process-step-execution-log.service';
import type { StartProcessResult } from '../automation/process-host/process-host.context';
import { ProcessStepLocksService } from './process_step_locks/process-step-locks.service';

@Controller('process-instances')
export class ProcessInstancesController {
  constructor(
    private readonly processInstancesService: ProcessInstancesService,
    private readonly processRunnerService: ProcessRunnerService,
    private readonly processLifecycle: ProcessLifecycleFacade,
    private readonly orchestrator: StepOrchestratorService,
    private readonly stepPermissions: ProcessStepPermissionService,
    private readonly processInstanceTimelineService: ProcessInstanceTimelineService,
    private readonly processStepExecutionLogService: ProcessStepExecutionLogService,
    private readonly stepLocks: ProcessStepLocksService,
  ) {}

  /**
   * Handles the creation of a new process instance.
   * @param userId - ID of the user making the request.
   * @param createProcessInstanceDto - Data transfer object containing process instance details.
   * @returns The created process instance entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROCESS_INSTANCE_PATTERN)
  @RequirePermissions('process_instances.create')
  @UsePipes(AppRpcValidationPipe)
  createProcessInstance(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createProcessInstanceDto: CreateProcessInstanceDto,
  ): Promise<ProcessInstanceEntity> {
    return this.processInstancesService.create(
      userId,
      createProcessInstanceDto,
    );
  }

  /**
   * Retrieves all process instances based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying process instances.
   * @returns A list of process instances matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_PATTERN)
  @RequirePermissions('process_instances.read')
  @UsePipes(AppRpcValidationPipe)
  findAllProcessInstances(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.processInstancesService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single process instance by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the process instance to retrieve.
   * @returns The process instance entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_PATTERN)
  @RequirePermissions('process_instances.read')
  findOneProcessInstance(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<ProcessInstanceEntity | NotFoundException> {
    return this.processInstancesService.findOne(userId, id);
  }

  /**
   * Updates an existing process instance.
   * @param userId - ID of the user making the request.
   * @param updateProcessInstanceDto - Data transfer object containing updated process instance details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_INSTANCE_PATTERN)
  @RequirePermissions('process_instances.update')
  @UsePipes(AppRpcValidationPipe)
  updateProcessInstance(
    @Payload('userId') userId: number,
    @Payload('data') updateProcessInstanceDto: UpdateProcessInstanceDto,
  ): Promise<UpdateResult> {
    return this.processInstancesService.update(
      userId,
      updateProcessInstanceDto.processInstanceId,
      updateProcessInstanceDto,
    );
  }

  /**
   * Deletes a process instance by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the process instance to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_INSTANCE_PATTERN)
  @RequirePermissions('process_instances.delete')
  removeProcessInstance(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.processInstancesService.remove(userId, id);
  }

  /**
   * Returns the aggregated Process Runner payload for a process instance.
   */
  @MessagePattern(MICROSERVICE_GET_PROCESS_INSTANCE_RUNNER_PATTERN)
  @RequirePermissions('process_instances.read')
  getProcessInstanceRunner(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') data: GetProcessInstanceRunnerDto | number,
  ): Promise<ProcessRunnerPayload> {
    const dto =
      typeof data === 'number'
        ? { processInstanceId: data }
        : data;

    return this.processRunnerService.buildPayload(
      userId,
      dto.processInstanceId,
      dto.tenantId,
      dto.tenantUserId,
      dto.childDepth,
    );
  }

  /**
   * Process-scoped audit timeline for the Runner panel (not platform P7 event timeline).
   */
  @MessagePattern(MICROSERVICE_GET_PROCESS_INSTANCE_TIMELINE_PATTERN)
  @RequirePermissions('process_instances.read')
  @UsePipes(AppRpcValidationPipe)
  getProcessInstanceTimeline(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: GetProcessInstanceTimelineDto,
  ): Promise<ProcessInstanceTimelineResult> {
    return this.processInstanceTimelineService.getTimeline(userId, dto);
  }

  /**
   * Append-only step lifecycle execution log for a process instance (E2).
   */
  @MessagePattern(MICROSERVICE_GET_PROCESS_INSTANCE_STEP_EXECUTION_LOG_PATTERN)
  @RequirePermissions('process_instances.read')
  @UsePipes(AppRpcValidationPipe)
  getProcessInstanceStepExecutionLog(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: GetProcessInstanceStepExecutionLogDto,
  ): Promise<ProcessStepExecutionLogResult> {
    return this.processStepExecutionLogService.getExecutionLog(userId, dto);
  }

  /**
   * True start semantics: instantiate + host onProcessStarted + first-step resolution.
   * Gateway should use this instead of `v0.1_create_process_instance`.
   */
  @MessagePattern(MICROSERVICE_START_PROCESS_PATTERN)
  @RequirePermissions('process_instances.create')
  @UsePipes(AppRpcValidationPipe)
  async startProcess(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: StartProcessDto,
  ): Promise<StartProcessResult> {
    const result = await this.processLifecycle.startProcess({
      tenantId: resolveProcessTemplateStoredTenantId(dto.tenantId),
      createdBy: dto.createdBy ?? userId,
      templateId: dto.templateId,
      subjectType: dto.subjectType,
      subjectId: dto.subjectId ?? 0,
      subjectMetadata: dto.subjectMetadata ?? null,
      context: dto.context ?? null,
      correlationId: dto.correlationId ?? null,
    });

    if (result.firstStepInstanceId) {
      await this.orchestrator.attemptAdvance(result.firstStepInstanceId, {
        cause: 'manual',
        correlationId: result.correlationId,
        actorTenantUserId: dto.createdBy ?? userId,
      });
    }

    return result;
  }

  /**
   * Bulk start semantics (G2): starts many process instances for the same template.
   */
  @MessagePattern(MICROSERVICE_BATCH_START_PROCESS_PATTERN)
  @RequirePermissions('process_instances.create')
  @UsePipes(AppRpcValidationPipe)
  async batchStartProcess(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: BatchStartProcessDto,
  ): Promise<
    | {
        status: 'queued';
        requested: number;
        deduped: number;
      }
    | {
        status: 'started';
        requested: number;
        deduped: number;
        results: Array<StartProcessResult & { itemIndex: number }>;
      }
  > {
    const result = await this.processLifecycle.batchStartProcess({
      tenantId: resolveProcessTemplateStoredTenantId(dto.tenantId),
      createdBy: dto.createdBy ?? userId,
      templateId: dto.templateId,
      async: dto.async ?? false,
      items: dto.items.map((item, index) => ({
        itemIndex: index,
        subjectType: item.subjectType,
        subjectId: item.subjectId ?? 0,
        subjectMetadata: item.subjectMetadata ?? null,
        context: item.context ?? null,
        correlationId: item.correlationId ?? null,
      })),
    });

    if (result.status === 'queued') {
      return {
        status: 'queued',
        requested: result.requested,
        deduped: result.deduped,
      };
    }

    return {
      status: 'started',
      requested: result.requested,
      deduped: result.deduped,
      results: result.results,
    };
  }

  @MessagePattern(MICROSERVICE_ACQUIRE_PROCESS_STEP_LOCK_PATTERN)
  @RequirePermissions('process_instances.update')
  @UsePipes(AppRpcValidationPipe)
  acquireProcessStepLock(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: AcquireProcessStepLockDto,
  ): Promise<{ lockHolder: number; lockExpiresAt: string }> {
    return this.stepLocks.acquire({
      stepInstanceId: dto.stepInstanceId,
      tenantUserId: dto.tenantUserId,
      ttlMs: dto.ttlMs,
    });
  }

  @MessagePattern(MICROSERVICE_RELEASE_PROCESS_STEP_LOCK_PATTERN)
  @RequirePermissions('process_instances.update')
  @UsePipes(AppRpcValidationPipe)
  async releaseProcessStepLock(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ReleaseProcessStepLockDto,
  ): Promise<{ released: boolean }> {
    await this.stepLocks.release({
      stepInstanceId: dto.stepInstanceId,
      tenantUserId: dto.tenantUserId,
    });
    return { released: true };
  }

  @MessagePattern(MICROSERVICE_HEARTBEAT_PROCESS_STEP_LOCK_PATTERN)
  @RequirePermissions('process_instances.update')
  @UsePipes(AppRpcValidationPipe)
  heartbeatProcessStepLock(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: HeartbeatProcessStepLockDto,
  ): Promise<{ lockHolder: number; lockExpiresAt: string }> {
    return this.stepLocks.heartbeat({
      stepInstanceId: dto.stepInstanceId,
      tenantUserId: dto.tenantUserId,
      ttlMs: dto.ttlMs,
    });
  }

  /**
   * Marks a manual (or ready) process step completed via the orchestrator.
   * Gateway: POST /process-instances/:processInstanceId/steps/:stepInstanceId/complete
   */
  @MessagePattern(MICROSERVICE_COMPLETE_PROCESS_INSTANCE_STEP_PATTERN)
  @RequirePermissions('process_instances.update')
  @UsePipes(AppRpcValidationPipe)
  async completeProcessInstanceStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CompleteProcessInstanceStepDto,
  ): Promise<{
    processInstanceId: number;
    stepInstanceId: number;
    status: 'completed';
  }> {
    await this.stepPermissions.assertCallerCanCompleteStep(
      userId,
      dto.stepInstanceId,
      dto.tenantUserId,
    );
    await this.stepLocks.assertCanMutateStep({
      stepInstanceId: dto.stepInstanceId,
      tenantUserId: dto.tenantUserId,
    });

    await this.orchestrator.markCompleted(dto.stepInstanceId, {
      cause: 'manual',
      correlationId: dto.correlationId,
      actorTenantUserId: userId,
      failOnPrecondition: true,
      expectedProcessInstanceId: dto.processInstanceId,
      expectedTenantId: dto.tenantId,
    });

    return {
      processInstanceId: dto.processInstanceId,
      stepInstanceId: dto.stepInstanceId,
      status: 'completed',
    };
  }

  /**
   * Skips a process step when allowed (`allowSkip` or `is_optional`).
   * Gateway: POST /process-instances/:processInstanceId/steps/:stepInstanceId/skip
   */
  @MessagePattern(MICROSERVICE_SKIP_PROCESS_INSTANCE_STEP_PATTERN)
  @RequirePermissions('process_instances.update')
  @UsePipes(AppRpcValidationPipe)
  async skipProcessInstanceStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: SkipProcessInstanceStepDto,
  ): Promise<{
    processInstanceId: number;
    stepInstanceId: number;
    status: 'skipped';
  }> {
    await this.stepPermissions.assertCallerCanCompleteStep(
      userId,
      dto.stepInstanceId,
      dto.tenantUserId,
    );
    await this.stepLocks.assertCanMutateStep({
      stepInstanceId: dto.stepInstanceId,
      tenantUserId: dto.tenantUserId,
    });

    await this.orchestrator.markSkipped(dto.stepInstanceId, {
      cause: 'manual',
      correlationId: dto.correlationId,
      actorTenantUserId: userId,
      failOnPrecondition: true,
      expectedProcessInstanceId: dto.processInstanceId,
      expectedTenantId: dto.tenantId,
    });

    return {
      processInstanceId: dto.processInstanceId,
      stepInstanceId: dto.stepInstanceId,
      status: 'skipped',
    };
  }

  @MessagePattern(MICROSERVICE_RETRY_PROCESS_INSTANCE_STEP_PATTERN)
  @RequirePermissions('process_instances.update')
  @UsePipes(AppRpcValidationPipe)
  async retryProcessInstanceStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: RetryProcessInstanceStepDto,
  ): Promise<{ processInstanceId: number; stepInstanceId: number; status: 'ready' }> {
    await this.stepPermissions.assertCallerCanCompleteStep(
      userId,
      dto.stepInstanceId,
      dto.tenantUserId,
    );

    await this.orchestrator.retry(dto.stepInstanceId, {
      cause: 'manual',
      correlationId: dto.correlationId,
      actorTenantUserId: userId,
      failOnPrecondition: true,
      expectedProcessInstanceId: dto.processInstanceId,
      expectedTenantId: dto.tenantId,
    });

    return {
      processInstanceId: dto.processInstanceId,
      stepInstanceId: dto.stepInstanceId,
      status: 'ready',
    };
  }

  @MessagePattern(MICROSERVICE_ROLLBACK_PROCESS_INSTANCE_STEP_PATTERN)
  @RequirePermissions('process_instances.update')
  @UsePipes(AppRpcValidationPipe)
  async rollbackProcessInstanceStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: RollbackProcessInstanceStepDto,
  ): Promise<{ processInstanceId: number; stepInstanceId: number; status: 'pending' }> {
    await this.stepPermissions.assertCallerCanCompleteStep(
      userId,
      dto.stepInstanceId,
      dto.tenantUserId,
    );

    await this.orchestrator.rollback(dto.stepInstanceId, {
      cause: 'manual',
      correlationId: dto.correlationId,
      actorTenantUserId: userId,
      failOnPrecondition: true,
      expectedProcessInstanceId: dto.processInstanceId,
      expectedTenantId: dto.tenantId,
    });

    return {
      processInstanceId: dto.processInstanceId,
      stepInstanceId: dto.stepInstanceId,
      status: 'pending',
    };
  }
}
