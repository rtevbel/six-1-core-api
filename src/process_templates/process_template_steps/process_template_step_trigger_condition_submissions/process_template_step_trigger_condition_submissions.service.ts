import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessTemplateStepTriggerConditionSubmissionEntity } from './entities/process_template_step_trigger_condition_submission.entity';
import { CreateProcessTemplateStepTriggerConditionSubmissionDto } from './dto/create-process_template_step_trigger_condition_submission.dto';
import { UpdateProcessTemplateStepTriggerConditionSubmissionDto } from './dto/update-process_template_step_trigger_condition_submission.dto';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import {FindAllResultInterface} from "./interfaces/findall-result.interface";
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class ProcessTemplateStepTriggerConditionSubmissionsService {
  constructor(
    @InjectRepository(ProcessTemplateStepTriggerConditionSubmissionEntity)
    private readonly submissionRepository: Repository<ProcessTemplateStepTriggerConditionSubmissionEntity>,
  ) {}

  /**
   * Creates a new submission record.
   * @param userId - ID of the user creating the record.
   * @param createSubmissionDto - Data Transfer Object containing submission details.
   * @returns The created ProcessTemplateStepTriggerConditionSubmissionEntity.
   */
  async create(
    userId: number,
    createSubmissionDto: CreateProcessTemplateStepTriggerConditionSubmissionDto,
  ): Promise<ProcessTemplateStepTriggerConditionSubmissionEntity> {
    const submission = this.submissionRepository.create(createSubmissionDto);
    return await this.submissionRepository.save(submission);
  }

  /**
   * Retrieves all submissions with optional filters, pagination, and sorting.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of submissions and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [submissions, total] = await this.submissionRepository.findAndCount(findQuery);

    if (submissions.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepTriggerConditionSubmissionEntity.name,
        ),
      );
    }

    return  {
      processTemplateStepTriggerConditionSubmissionRecords: submissions,
      pagination: this.buildPagination(filtersDto, total),
    }
  }

  /**
   * Retrieves a single submission by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the submission to retrieve.
   * @returns The ProcessTemplateStepTriggerConditionSubmissionEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessTemplateStepTriggerConditionSubmissionEntity> {
    const submission = await this.submissionRepository.findOne({
      where: { stepTriggerConditionSubmissionId: id },
      relations: ['stepTriggerCondition' , 'reviewedByUser'],
    });

    if (!submission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepTriggerConditionSubmissionEntity.name,
        ),
      );
    }

    return submission;
  }

  /**
   * Updates an existing submission record.
   * @param userId - ID of the user making the request.
   * @param id - ID of the submission to update.
   * @param updateSubmissionDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateSubmissionDto: UpdateProcessTemplateStepTriggerConditionSubmissionDto,
  ): Promise<UpdateResult> {
    const submission = await this.submissionRepository.findOneBy({
      stepTriggerConditionSubmissionId: id,
    });

    if (!submission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepTriggerConditionSubmissionEntity.name,
        ),
      );
    }

    return await this.submissionRepository.update(id, updateSubmissionDto);
  }

  /**
   * Deletes a submission record by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the submission to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.submissionRepository.delete({
      stepTriggerConditionSubmissionId: id,
    });
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      relations: ['stepTriggerCondition' , 'reviewedByUser'],
    };

    
    // Add where condition for stepTriggerConditionId if provided
    query.where = {
        stepTriggerConditionId: filtersDto.stepTriggerConditionId,
    };
    

    if (filtersDto.search) {
      query.where = [{ submittedData: Like(`%${filtersDto.search}%`) }];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

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
   * @param filtersDto - Filters containing pagination details.
   * @param total - Total number of records matching the query.
   * @returns The pagination object.
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