import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessInstanceStepRequirementsService } from './process_instance_step_requirements.service';
import { CreateProcessInstanceStepRequirementDto } from './dto/create-process_instance_step_requirement.dto';
import { UpdateProcessInstanceStepRequirementDto } from './dto/update-process_instance_step_requirement.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessInstanceStepRequirementEntity } from './entities/process_instance_step_requirement.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_PROCESS_INSTANCE_STEP_REQUIREMENT_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_STEP_REQUIREMENT_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_STEP_REQUIREMENT_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_INSTANCE_STEP_REQUIREMENT_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_INSTANCE_STEP_REQUIREMENT_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';

@Controller('process-instance-step-requirements')
export class ProcessInstanceStepRequirementsController {
  constructor(
    private readonly processInstanceStepRequirementsService: ProcessInstanceStepRequirementsService,
  ) {}

  /**
   * Handles the creation of a new process instance step requirement.
   * @param userId - ID of the user making the request.
   * @param createDto - Data transfer object containing requirement details.
   * @returns The created process instance step requirement entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROCESS_INSTANCE_STEP_REQUIREMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createProcessInstanceStepRequirement(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateProcessInstanceStepRequirementDto,
  ): Promise<ProcessInstanceStepRequirementEntity> {
    return this.processInstanceStepRequirementsService.create(
      userId,
      createDto,
    );
  }

  /**
   * Retrieves all process instance step requirements based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying process instance step requirements.
   * @returns A list of process instance step requirements matching the filters.
   */
  @MessagePattern(
    MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_STEP_REQUIREMENT_PATTERN,
  )
  @UsePipes(AppRpcValidationPipe)
  findAllProcessInstanceStepRequirements(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.processInstanceStepRequirementsService.findAll(
      userId,
      filtersDto,
    );
  }

  /**
   * Retrieves a single process instance step requirement by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the process instance step requirement to retrieve.
   * @returns The process instance step requirement entity or a NotFoundException.
   */
  @MessagePattern(
    MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_STEP_REQUIREMENT_PATTERN,
  )
  findOneProcessInstanceStepRequirement(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<ProcessInstanceStepRequirementEntity | NotFoundException> {
    return this.processInstanceStepRequirementsService.findOne(userId, id);
  }

  /**
   * Updates an existing process instance step requirement.
   * @param userId - ID of the user making the request.
   * @param updateDto - Data transfer object containing updated requirement details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_INSTANCE_STEP_REQUIREMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateProcessInstanceStepRequirement(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateDto: UpdateProcessInstanceStepRequirementDto,
  ): Promise<UpdateResult> {
    return this.processInstanceStepRequirementsService.update(
      userId,
      updateDto.requirementInstanceId,
      updateDto,
    );
  }

  /**
   * Deletes a process instance step requirement by ID.
   * @param userId - ID of the user making the request.
   * @param stepInstanceId - ID of the step instance the requirement belongs to.
   * @param id - ID of the process instance step requirement to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_INSTANCE_STEP_REQUIREMENT_PATTERN)
  removeProcessInstanceStepRequirement(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('stepInstanceId', ParseIntPipe) stepInstanceId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.processInstanceStepRequirementsService.remove(
      userId,
      stepInstanceId,
      id,
    );
  }
}
