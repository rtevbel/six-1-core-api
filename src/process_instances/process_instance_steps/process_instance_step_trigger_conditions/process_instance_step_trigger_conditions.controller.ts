import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessInstanceStepTriggersService } from './process_instance_step_trigger_conditions.service';
import { CreateProcessInstanceStepTriggerDto } from './dto/create-process_instance_step_trigger_condition.dto';
import { UpdateProcessInstanceStepTriggerDto } from './dto/update-process_instance_step_trigger_condition.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessInstanceStepTriggerEntity } from './entities/process_instance_step_trigger_condition.entity';
import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_PROCESS_INSTANCE_STEP_TRIGGER_CONDITION_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_STEP_TRIGGER_CONDITION_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_STEP_TRIGGER_CONDITION_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_INSTANCE_STEP_TRIGGER_CONDITION_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_INSTANCE_STEP_TRIGGER_CONDITION_PATTERN,
} from './constants';

@Controller('process-instance-step-triggers')
export class ProcessInstanceStepTriggersController {
  constructor(
    private readonly triggersService: ProcessInstanceStepTriggersService,
  ) {}

  /**
   * Handles the creation of a new process instance step trigger.
   * @param userId - ID of the user making the request.
   * @param createDto - Data transfer object containing trigger details.
   * @returns The created trigger entity.
   */
  @MessagePattern(
    MICROSERVICE_CREATE_PROCESS_INSTANCE_STEP_TRIGGER_CONDITION_PATTERN,
  )
  @UsePipes(AppRpcValidationPipe)
  createTrigger(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateProcessInstanceStepTriggerDto,
  ): Promise<ProcessInstanceStepTriggerEntity> {
    return this.triggersService.create(userId, createDto);
  }

  /**
   * Retrieves all triggers based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying triggers.
   * @returns A list of triggers matching the filters.
   */
  @MessagePattern(
    MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_STEP_TRIGGER_CONDITION_PATTERN,
  )
  @UsePipes(AppRpcValidationPipe)
  findAllTriggers(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.triggersService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single trigger by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the trigger to retrieve.
   * @returns The trigger entity or a NotFoundException.
   */
  @MessagePattern(
    MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_STEP_TRIGGER_CONDITION_PATTERN,
  )
  findOneTrigger(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<ProcessInstanceStepTriggerEntity | NotFoundException> {
    return this.triggersService.findOne(userId, id);
  }

  /**
   * Updates an existing trigger.
   * @param userId - ID of the user making the request.
   * @param updateDto - Data transfer object containing updated trigger details.
   * @returns The result of the update operation.
   */
  @MessagePattern(
    MICROSERVICE_UPDATE_PROCESS_INSTANCE_STEP_TRIGGER_CONDITION_PATTERN,
  )
  @UsePipes(AppRpcValidationPipe)
  updateTrigger(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateDto: UpdateProcessInstanceStepTriggerDto,
  ): Promise<UpdateResult> {
    return this.triggersService.update(
      userId,
      updateDto.triggerInstanceId,
      updateDto,
    );
  }

  /**
   * Deletes a trigger by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the trigger to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(
    MICROSERVICE_REMOVE_PROCESS_INSTANCE_STEP_TRIGGER_CONDITION_PATTERN,
  )
  removeTrigger(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.triggersService.remove(userId, id);
  }
}
