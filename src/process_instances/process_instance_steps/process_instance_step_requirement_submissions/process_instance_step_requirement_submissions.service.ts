import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessInstanceStepRequirementSubmissionEntity } from './entities/process_instance_step_requirement_submission.entity';
import { CreateProcessInstanceStepRequirementSubmissionDto } from './dto/create-process_instance_step_requirement_submission.dto';
import { UpdateProcessInstanceStepRequirementSubmissionDto } from './dto/update-process_instance_step_requirement_submission.dto';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class ProcessInstanceStepRequirementSubmissionsService {
  constructor(
    @InjectRepository(ProcessInstanceStepRequirementSubmissionEntity)
    private readonly submissionRepository: Repository<ProcessInstanceStepRequirementSubmissionEntity>,
  ) {}

  /**
   * Creates a new submission record in the database.
   * @param userId - ID of the user creating the submission.
   * @param createDto - Data Transfer Object containing the submission details.
   * @returns The created submission entity.
   */
  async create(
    userId: number,
    createDto: CreateProcessInstanceStepRequirementSubmissionDto,
  ): Promise<ProcessInstanceStepRequirementSubmissionEntity> {
    const submission = this.submissionRepository.create(createDto);
    return await this.submissionRepository.save(submission);
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
      relations: ['processInstanceStepRequirement', 'reviewedByUser'],
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