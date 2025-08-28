import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplateStepTriggerConditionsService } from './process_template_step_trigger_conditions.service';
import { CreateProcessTemplateStepTriggerConditionDto } from './dto/create-process_template_step_trigger_condition.dto';
import { UpdateProcessTemplateStepTriggerConditionDto } from './dto/update-process_template_step_trigger_condition.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessTemplateStepTriggerConditionEntity } from './entities/process_template_step_trigger_condition.entity';
import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import {FindAllResultInterface} from "./interfaces/findall-result.interface";

import {
MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_PATTERN,
MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_PATTERN,
MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_PATTERN,
MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_PATTERN,
MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_PATTERN
} from './constants';

@Controller('process-template-step-trigger-conditions')
export class ProcessTemplateStepTriggerConditionsController {
  constructor(
    private readonly triggerConditionsService: ProcessTemplateStepTriggerConditionsService,
  ) {}

  /**
   * Handles the creation of a new trigger condition.
   * @param userId - ID of the user making the request.
   * @param createDto - Data transfer object containing trigger condition details.
   * @returns The created trigger condition entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createTriggerCondition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateProcessTemplateStepTriggerConditionDto,
  ): Promise<ProcessTemplateStepTriggerConditionEntity> {
    return this.triggerConditionsService.create(userId, createDto);
  }

  /**
   * Retrieves all trigger conditions based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying trigger conditions.
   * @returns A list of trigger conditions matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllTriggerConditions(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.triggerConditionsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single trigger condition by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the trigger condition to retrieve.
   * @returns The trigger condition entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_PATTERN)
  findOneTriggerCondition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<ProcessTemplateStepTriggerConditionEntity | NotFoundException> {
    return this.triggerConditionsService.findOne(userId, id);
  }

  /**
   * Updates an existing trigger condition.
   * @param userId - ID of the user making the request.
   * @param updateDto - Data transfer object containing updated trigger condition details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateTriggerCondition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateDto: UpdateProcessTemplateStepTriggerConditionDto,
  ): Promise<UpdateResult> {
    return this.triggerConditionsService.update(
      userId,
      updateDto.stepTriggerConditionId,
      updateDto,
    );
  }

  /**
   * Deletes a trigger condition by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the trigger condition to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_PATTERN)
  removeTriggerCondition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.triggerConditionsService.remove(userId, id);
  }
}