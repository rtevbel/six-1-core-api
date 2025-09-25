import { Injectable , NotFoundException } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessInstanceStepRequirementSubmissionEntity } from './entities/process_instance_step_requirement_submission.entity';
import { CreateProcessInstanceStepRequirementSubmissionDto } from './dto/create-process_instance_step_requirement_submission.dto';
import { UpdateProcessInstanceStepRequirementSubmissionDto } from './dto/update-process_instance_step_requirement_submission.dto';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import { RequirementValidationService } from '../../../automation/requirement-validation.service';
import { RequirementEnvelope } from '../../../automation/requirement-validation.service';
import { StepOrchestratorService } from '../../../automation/step-orchestrator.service';
import {EventsService} from "../../../events/events.service";
import {ProcessInstanceStepRequirementsService} from "../process_instance_step_requirements/process_instance_step_requirements.service";

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class ProcessInstanceStepRequirementSubmissionsService {
  constructor(
    @InjectRepository(ProcessInstanceStepRequirementSubmissionEntity)
    private readonly submissionRepository: Repository<ProcessInstanceStepRequirementSubmissionEntity>,
    private readonly validator: RequirementValidationService,
    private readonly orchestrator: StepOrchestratorService,
    private readonly events: EventsService,
    private readonly requirementService: ProcessInstanceStepRequirementsService,
  ) {}

  /**
   * Creates a submission, validates it against the requirement's JSON envelope,
   * updates requirement instance status, emits events, and tries to advance the step.
   * @param userId - ID of the user creating the submission.
   * @param createDto - Data Transfer Object containing the submission details.
   * @returns The created submission entity.
   */
  async create(
    userId: number,
    createDto: CreateProcessInstanceStepRequirementSubmissionDto,
  ): Promise<ProcessInstanceStepRequirementSubmissionEntity> {


    const instanceRequirement = await this.requirementService.findOne(userId, createDto.requirementInstanceId);
    if (!instanceRequirement) throw new NotFoundException('Requirement instance not found');

    // Ensure jsonSchema is of type RequirementEnvelope
    const jsonSchema: RequirementEnvelope = instanceRequirement.jsonSchema as RequirementEnvelope;

    // Get the specific requirement from the instance
    const { valid, errors, autoApprove } = this.validator.validateSubmission(
      Number(instanceRequirement.requirementInstanceId),
      new Date(instanceRequirement.evaluatedAt ?? Date.now()),
      jsonSchema,
      createDto.submittedData,
    );
   
     // Persist submission
    const findlPayload: CreateProcessInstanceStepRequirementSubmissionDto = {
     requirementInstanceId: createDto.requirementInstanceId,
     submittedData: createDto.submittedData,
     isValid: valid ? true : false,
     validationErrors: errors?.length ? JSON.parse(JSON.stringify(errors)) : undefined,
     status: autoApprove ? 'approved' : 'pending',
     createdBy: userId,
    };

    const submission = this.submissionRepository.create(findlPayload);
    const saved = await this.submissionRepository.save(submission);

    await this.requirementService.update(userId, instanceRequirement.requirementInstanceId!, {
      requirementInstanceId: instanceRequirement.requirementInstanceId!,
      lastSubmissionId: saved.requirementSubmissionId,
      status: autoApprove ? 'approved' : 'pending',
      approvedAt: autoApprove ? new Date() : undefined,
      evaluatedAt: new Date(),
    });
    
     // Emit domain events (so event-based triggers and logs pick them up)
     await this.events.emitAsync('six1-event.requirement.process_requirement_submitted', {
      userId,
      entity: { entityType: 'Requirement', entityId: createDto.requirementInstanceId },
      data: {
        requirementInstanceId: createDto.requirementInstanceId,
        submissionId: saved.requirementSubmissionId,
        stepInstanceId: instanceRequirement.stepInstanceId,
      },
    });
    if (autoApprove) {
      await this.events.emitAsync('six1-event.requirement.process_requirement_approved', {
        userId,
        entity: { entityType: 'Requirement', entityId: createDto.requirementInstanceId },
        data: {
          requirementInstanceId: createDto.requirementInstanceId,
          submissionId: saved.requirementSubmissionId,
          stepInstanceId: instanceRequirement.stepInstanceId,
        },
      });
    }

    // Try to advance the step (idempotent)
    await this.orchestrator.attemptAdvance(instanceRequirement.stepInstanceId, { cause: 'event' });

    return saved;
  }

  /**
   * Retrieves all submissions based on optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the submissions.
   * @param filtersDto - Filters, pagination, and sorting options.
   * @returns An object containing the submissions and pagination details.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<{
    submissions: ProcessInstanceStepRequirementSubmissionEntity[];
    pagination: any;
  }> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [submissions, total] =
      await this.submissionRepository.findAndCount(findQuery);

    if (submissions.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepRequirementSubmissionEntity.name,
        ),
      );
    }

    return {
      submissions,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single submission by its ID.
   * @param userId - ID of the user requesting the submission.
   * @param id - ID of the submission to retrieve.
   * @returns The submission entity if found.
   * @throws RpcException if no submission is found with the given ID.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessInstanceStepRequirementSubmissionEntity> {
    const submission = await this.submissionRepository.findOne({
      where: { requirementSubmissionId: id },
      relations: ['processInstanceStepRequirement', 'reviewedByUser'],
    });

    if (!submission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepRequirementSubmissionEntity.name,
        ),
      );
    }

    return submission;
  }

  /**
   * Updates an existing submission record by its ID.
   * @param userId - ID of the user updating the submission.
   * @param id - ID of the submission to update.
   * @param updateDto - Data Transfer Object containing the updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no submission is found with the given ID.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessInstanceStepRequirementSubmissionDto,
  ): Promise<UpdateResult> {
    const submission = await this.submissionRepository.findOneBy({
      requirementSubmissionId: id,
    });

    if (!submission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepRequirementSubmissionEntity.name,
        ),
      );
    }
  
   // If status flipped to approved, bump the parent requirement instance & attempt advance
   if (updateDto.status === 'approved') {
    
      const instanceRequirement = await this.requirementService.findOne(userId, submission.requirementInstanceId);

      if (instanceRequirement.requirementInstanceId) {
        
         await this.requirementService.update(userId, instanceRequirement.requirementInstanceId, {
           status: 'approved',
           approvedAt: new Date(),
           evaluatedAt: new Date(),
           requirementInstanceId: instanceRequirement.requirementInstanceId,
         });
        // Emit domain events (so event-based triggers and logs pick them up)
        await this.events.emitAsync('six1-event.requirement.process_requirement_approved', {
          userId,
          entity: { entityType: 'Requirement', entityId: instanceRequirement.requirementInstanceId},
          data: { requirementInstanceId:instanceRequirement.requirementInstanceId, submissionId: id, stepInstanceId: instanceRequirement.stepInstanceId },
        });
        await this.orchestrator.attemptAdvance(instanceRequirement.stepInstanceId, { cause: 'event' });
      }
    }

    return await this.submissionRepository.update({requirementSubmissionId:id}, updateDto);
  }

  /**
   * Deletes a submission record by its ID.
   * @param userId - ID of the user deleting the submission.
   * @param id - ID of the submission to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.submissionRepository.delete({
      requirementSubmissionId: id,
    });
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters, pagination, and sorting options.
   * @returns The query object to be used with the repository.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      relations: ['processInstanceStepRequirement','reviewedByUser'],
    };

    // Mandatory filter for requirementInstanceId
    query.where = {
      requirementInstanceId: filtersDto.requirementInstanceId,
    };

    // Optional search filter
    if (filtersDto.search) {
      query.where = [{ submittedData: Like(`%${filtersDto.search}%`) }];
    }

    // Optional sorting
    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    // Optional pagination
    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  /**
   * Builds the pagination object for the response.
   * @param filtersDto - Filters, pagination, and sorting options.
   * @param total - Total number of records matching the filters.
   * @returns The pagination details.
   */
  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }
}