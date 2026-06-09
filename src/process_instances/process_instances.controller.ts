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
import { CreateProcessInstanceDto } from './dto/create-process_instance.dto';
import { UpdateProcessInstanceDto } from './dto/update-process_instance.dto';
import { FiltersDto } from './dto/filters.dto';
import { GetProcessInstanceRunnerDto } from './dto/get-process-instance-runner.dto';
import { StartProcessDto } from './dto/start-process.dto';
import { CompleteProcessInstanceStepDto } from './dto/complete-process-instance-step.dto';
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
  MICROSERVICE_START_PROCESS_PATTERN,
  MICROSERVICE_COMPLETE_PROCESS_INSTANCE_STEP_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { ProcessLifecycleFacade } from '../automation/process-lifecycle.facade';
import { StepOrchestratorService } from '../automation/step-orchestrator.service';
import type { StartProcessResult } from '../automation/process-host/process-host.context';

@Controller('process-instances')
export class ProcessInstancesController {
  constructor(
    private readonly processInstancesService: ProcessInstancesService,
    private readonly processRunnerService: ProcessRunnerService,
    private readonly processLifecycle: ProcessLifecycleFacade,
    private readonly orchestrator: StepOrchestratorService,
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
    );
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
      tenantId: dto.tenantId,
      createdBy: dto.createdBy ?? userId,
      templateId: dto.templateId,
      subjectType: dto.subjectType,
      subjectId: dto.subjectId,
      subjectMetadata: dto.subjectMetadata ?? null,
      context: dto.context ?? null,
      correlationId: dto.correlationId ?? null,
    });

    if (result.firstStepInstanceId) {
      await this.orchestrator.attemptAdvance(result.firstStepInstanceId, {
        cause: 'manual',
        correlationId: dto.correlationId ?? undefined,
        actorTenantUserId: dto.createdBy ?? userId,
      });
    }

    return result;
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
}
