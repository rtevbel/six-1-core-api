import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessInstanceStepsService } from './process_instance_steps.service';
import { CreateProcessInstanceStepDto } from './dto/create-process_instance_step.dto';
import { UpdateProcessInstanceStepDto } from './dto/update-process_instance_step.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessInstanceStepEntity } from './entities/process_instance_step.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_PROCESS_INSTANCE_STEP_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_STEP_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_STEP_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_INSTANCE_STEP_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_INSTANCE_STEP_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';

@Controller('process-instance-steps')
export class ProcessInstanceStepsController {
  constructor(
    private readonly processInstanceStepsService: ProcessInstanceStepsService,
  ) {}

  /**
   * Handles the creation of a new process instance step.
   * @param userId - ID of the user making the request.
   * @param createProcessInstanceStepDto - Data transfer object containing step details.
   * @returns The created process instance step entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROCESS_INSTANCE_STEP_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createProcessInstanceStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createProcessInstanceStepDto: CreateProcessInstanceStepDto,
  ): Promise<ProcessInstanceStepEntity> {
    return this.processInstanceStepsService.create(
      userId,
      createProcessInstanceStepDto,
    );
  }

  /**
   * Retrieves all process instance steps based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying process instance steps.
   * @returns A list of process instance steps matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_STEP_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllProcessInstanceSteps(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.processInstanceStepsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single process instance step by ID.
   * @param userId - ID of the user making the request.
   * @param processInstanceId - ID of the process instance to which the step belongs.
   * @param id - ID of the process instance step to retrieve.
   * @returns The process instance step entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_STEP_PATTERN)
  findOneProcessInstanceStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('processInstanceId', ParseIntPipe) processInstanceId: number,
    @Payload('data') id: number,
  ): Promise<ProcessInstanceStepEntity | NotFoundException> {
    return this.processInstanceStepsService.findOne(
      userId,
      processInstanceId,
      id,
    );
  }

  /**
   * Updates an existing process instance step.
   * @param userId - ID of the user making the request.
   * @param updateProcessInstanceStepDto - Data transfer object containing updated step details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_INSTANCE_STEP_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateProcessInstanceStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateProcessInstanceStepDto: UpdateProcessInstanceStepDto,
  ): Promise<UpdateResult> {
    return this.processInstanceStepsService.update(
      userId,
      updateProcessInstanceStepDto.stepInstanceId,
      updateProcessInstanceStepDto,
    );
  }

  /**
   * Deletes a process instance step by ID.
   * @param userId - ID of the user making the request.
   * @param processInstanceId - ID of the process instance to which the step belongs.
   * @param id - ID of the process instance step to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_INSTANCE_STEP_PATTERN)
  removeProcessInstanceStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('processInstanceId', ParseIntPipe) processInstanceId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.processInstanceStepsService.remove(
      userId,
      processInstanceId,
      id,
    );
  }
}
