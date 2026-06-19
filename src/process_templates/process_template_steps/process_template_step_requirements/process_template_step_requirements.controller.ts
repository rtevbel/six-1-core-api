import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplateStepRequirementsService } from './process_template_step_requirements.service';
import { CreateProcessTemplateStepRequirementDto } from './dto/create-process_template_step_requirement.dto';
import { UpdateProcessTemplateStepRequirementDto } from './dto/update-process_template_step_requirement.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessTemplateStepRequirementEntity } from './entities/process_template_step_requirement.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_REQUIREMENT_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_REQUIREMENT_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_REQUIREMENT_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_REQUIREMENT_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_REQUIREMENT_PATTERN,
  MICROSERVICE_SUGGEST_PROCESS_TEMPLATE_STEP_REQUIREMENT_BINDING_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { SuggestProcessTemplateStepRequirementBindingDto } from './dto/suggest-process_template_step_requirement_binding.dto';
import type { RequirementToBindingSuggestion } from './process-step-requirement-authoring.validation';

@Controller('process-template-step-requirements')
export class ProcessTemplateStepRequirementsController {
  constructor(
    private readonly processTemplateStepRequirementsService: ProcessTemplateStepRequirementsService,
  ) {}

  /**
   * Handles the creation of a new process template step requirement.
   * @param userId - ID of the user making the request.
   * @param createDto - Data transfer object containing requirement details.
   * @returns The created process template step requirement entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_REQUIREMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createProcessTemplateStepRequirement(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateProcessTemplateStepRequirementDto,
  ): Promise<ProcessTemplateStepRequirementEntity> {
    return this.processTemplateStepRequirementsService.create(
      userId,
      createDto,
    );
  }

  /**
   * Retrieves all process template step requirements based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying process template step requirements.
   * @returns A list of process template step requirements matching the filters.
   */
  @MessagePattern(
    MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_REQUIREMENT_PATTERN,
  )
  @UsePipes(AppRpcValidationPipe)
  findAllProcessTemplateStepRequirements(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.processTemplateStepRequirementsService.findAll(
      userId,
      filtersDto,
    );
  }

  /**
   * Retrieves a single process template step requirement by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the process template step requirement to retrieve.
   * @returns The process template step requirement entity or a NotFoundException.
   */
  @MessagePattern(
    MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_REQUIREMENT_PATTERN,
  )
  findOneProcessTemplateStepRequirement(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<ProcessTemplateStepRequirementEntity | NotFoundException> {
    return this.processTemplateStepRequirementsService.findOne(userId, id);
  }

  /**
   * Updates an existing process template step requirement.
   * @param userId - ID of the user making the request.
   * @param updateDto - Data transfer object containing updated requirement details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_REQUIREMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateProcessTemplateStepRequirement(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateDto: UpdateProcessTemplateStepRequirementDto,
  ): Promise<UpdateResult> {
    return this.processTemplateStepRequirementsService.update(
      userId,
      updateDto.processTemplateStepRequirementId,
      updateDto,
    );
  }

  /**
   * Deletes a process template step requirement by ID.
   * @param userId - ID of the user making the request.
   * @param processTemplateStepId - ID of the process template step the requirement belongs to.
   * @param id - ID of the process template step requirement to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_REQUIREMENT_PATTERN)
  removeProcessTemplateStepRequirement(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('processTemplateStepId', ParseIntPipe)
    processTemplateStepId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.processTemplateStepRequirementsService.remove(
      userId,
      processTemplateStepId,
      id,
    );
  }

  /**
   * Migration helper: suggest object binding + completion_rule for field-form requirements.
   */
  @MessagePattern(
    MICROSERVICE_SUGGEST_PROCESS_TEMPLATE_STEP_REQUIREMENT_BINDING_PATTERN,
  )
  @UsePipes(AppRpcValidationPipe)
  suggestProcessTemplateStepRequirementBinding(
    @Payload('userId', ParseIntPipe) _userId: number,
    @Payload('data') dto: SuggestProcessTemplateStepRequirementBindingDto,
  ): Promise<
    RequirementToBindingSuggestion | RequirementToBindingSuggestion[] | null
  > {
    if (dto.processTemplateStepRequirementId) {
      return this.processTemplateStepRequirementsService.suggestBindingForRequirement(
        dto.processTemplateStepRequirementId,
        dto.tenantId,
      );
    }

    if (dto.processTemplateStepId) {
      return this.processTemplateStepRequirementsService.suggestBindingsForStep(
        dto.processTemplateStepId,
        dto.tenantId,
      );
    }

    return Promise.resolve(null);
  }
}
