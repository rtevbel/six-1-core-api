import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplateStepsService } from './process_template_steps.service';
import { CreateProcessTemplateStepDto } from './dto/create-process_template_step.dto';
import { UpdateProcessTemplateStepDto } from './dto/update-process_template_step.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessTemplateStepEntity } from './entities/process_template_step.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';

@Controller('process-template-steps')
export class ProcessTemplateStepsController {
  constructor(
    private readonly processTemplateStepsService: ProcessTemplateStepsService,
  ) {}

  /**
   * Handles the creation of a new process template step.
   * @param userId - ID of the user making the request.
   * @param createProcessTemplateStepDto - Data transfer object containing step details.
   * @returns The created process template step entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createProcessTemplateStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createProcessTemplateStepDto: CreateProcessTemplateStepDto,
  ): Promise<ProcessTemplateStepEntity> {
    return this.processTemplateStepsService.create(
      userId,
      createProcessTemplateStepDto,
    );
  }

  /**
   * Retrieves all process template steps based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying process template steps.
   * @returns A list of process template steps matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllProcessTemplateSteps(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.processTemplateStepsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single process template step by ID.
   * @param userId - ID of the user making the request.
   * @param processTemplateId - ID of the process template to which the step belongs.
   * @param id - ID of the process template step to retrieve.
   * @returns The process template step entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_PATTERN)
  findOneProcessTemplateStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('processTemplateId', ParseIntPipe) processTemplateId: number,
    @Payload('data') id: number,
  ): Promise<ProcessTemplateStepEntity | NotFoundException> {
    return this.processTemplateStepsService.findOne(userId, processTemplateId,id);
  }

  /**
   * Updates an existing process template step.
   * @param userId - ID of the user making the request.
   * @param updateProcessTemplateStepDto - Data transfer object containing updated step details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateProcessTemplateStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateProcessTemplateStepDto: UpdateProcessTemplateStepDto,
  ): Promise<UpdateResult> {
    return this.processTemplateStepsService.update(
      userId,
      updateProcessTemplateStepDto.processTemplateStepId,
      updateProcessTemplateStepDto,
    );
  }

  /**
   * Deletes a process template step by ID.
   * @param userId - ID of the user making the request.
   * @param processTemplateId - ID of the process template to which the step belongs.
   * @param id - ID of the process template step to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_PATTERN)
  removeProcessTemplateStep(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('processTemplateId', ParseIntPipe) processTemplateId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.processTemplateStepsService.remove(userId,processTemplateId,id);
  }
}
