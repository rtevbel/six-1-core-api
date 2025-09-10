import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplateStepTriggerConditionSubmissionsService } from './process_template_step_trigger_condition_submissions.service';
import { CreateProcessTemplateStepTriggerConditionSubmissionDto } from './dto/create-process_template_step_trigger_condition_submission.dto';
import { UpdateProcessTemplateStepTriggerConditionSubmissionDto } from './dto/update-process_template_step_trigger_condition_submission.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessTemplateStepTriggerConditionSubmissionEntity } from './entities/process_template_step_trigger_condition_submission.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';

@Controller('process-template-step-trigger-condition-submissions')
export class ProcessTemplateStepTriggerConditionSubmissionsController {
  constructor(
    private readonly submissionsService: ProcessTemplateStepTriggerConditionSubmissionsService,
  ) {}

  /**
   * Handles the creation of a new submission.
   * @param userId - ID of the user making the request.
   * @param createSubmissionDto - Data transfer object containing submission details.
   * @returns The created submission entity.
   */
  @MessagePattern(
    MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_PATTERN,
  )
  @UsePipes(AppRpcValidationPipe)
  createSubmission(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    createSubmissionDto: CreateProcessTemplateStepTriggerConditionSubmissionDto,
  ): Promise<ProcessTemplateStepTriggerConditionSubmissionEntity> {
    return this.submissionsService.create(userId, createSubmissionDto);
  }

  /**
   * Retrieves all submissions based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying submissions.
   * @returns A list of submissions matching the filters.
   */
  @MessagePattern(
    MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_PATTERN,
  )
  @UsePipes(AppRpcValidationPipe)
  findAllSubmissions(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.submissionsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single submission by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the submission to retrieve.
   * @returns The submission entity or a NotFoundException.
   */
  @MessagePattern(
    MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_PATTERN,
  )
  findOneSubmission(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<
    ProcessTemplateStepTriggerConditionSubmissionEntity | NotFoundException
  > {
    return this.submissionsService.findOne(userId, id);
  }

  /**
   * Updates an existing submission.
   * @param userId - ID of the user making the request.
   * @param updateSubmissionDto - Data transfer object containing updated submission details.
   * @returns The result of the update operation.
   */
  @MessagePattern(
    MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_PATTERN,
  )
  @UsePipes(AppRpcValidationPipe)
  updateSubmission(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    updateSubmissionDto: UpdateProcessTemplateStepTriggerConditionSubmissionDto,
  ): Promise<UpdateResult> {
    return this.submissionsService.update(
      userId,
      updateSubmissionDto.stepTriggerConditionSubmissionId,
      updateSubmissionDto,
    );
  }

  /**
   * Deletes a submission by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the submission to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(
    MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_PATTERN,
  )
  removeSubmission(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.submissionsService.remove(userId, id);
  }
}
