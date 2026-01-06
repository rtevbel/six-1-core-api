import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessTemplateStepTriggerConditionEntity } from './entities/process_template_step_trigger_condition.entity';
import { CreateProcessTemplateStepTriggerConditionDto } from './dto/create-process_template_step_trigger_condition.dto';
import { UpdateProcessTemplateStepTriggerConditionDto } from './dto/update-process_template_step_trigger_condition.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class ProcessTemplateStepTriggerConditionsService {
  constructor(
    @InjectRepository(ProcessTemplateStepTriggerConditionEntity)
    private readonly triggerConditionRepository: Repository<ProcessTemplateStepTriggerConditionEntity>,
  ) {}

  /**
   * Creates a new trigger condition record.
   * @param userId - ID of the user creating the record.
   * @param createDto - Data Transfer Object containing trigger condition details.
   * @returns The created ProcessTemplateStepTriggerConditionEntity.
   */
  async create(
    userId: number,
    createDto: CreateProcessTemplateStepTriggerConditionDto,
  ): Promise<ProcessTemplateStepTriggerConditionEntity> {
    const condition = this.triggerConditionRepository.create(createDto);
    return await this.triggerConditionRepository.save(condition);
  }

  /**
   * Retrieves all trigger conditions with optional filters, pagination, and sorting.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of trigger conditions and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [conditions, total] =
      await this.triggerConditionRepository.findAndCount(findQuery);

    // Return empty array instead of throwing exception when no records found
    // This allows the frontend to handle empty states gracefully
    return {
      processTemplateStepTriggerConditionRecords: conditions || [],
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single trigger condition by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the trigger condition to retrieve.
   * @returns The ProcessTemplateStepTriggerConditionEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessTemplateStepTriggerConditionEntity> {
    const condition = await this.triggerConditionRepository.findOne({
      where: { stepTriggerConditionId: id },
    });

    if (!condition) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessTemplateStepTriggerCondition',
        ),
      );
    }

    return condition;
  }

  /**
   * Updates an existing trigger condition record.
   * @param userId - ID of the user making the request.
   * @param id - ID of the trigger condition to update.
   * @param UpdateProcessTemplateStepTriggerConditionDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessTemplateStepTriggerConditionDto,
  ): Promise<UpdateResult> {
    const condition = await this.triggerConditionRepository.findOneBy({
      stepTriggerConditionId: id,
    });

    if (!condition) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepTriggerConditionEntity.name,
        ),
      );
    }

    return await this.triggerConditionRepository.update(id, updateDto);
  }

  /**
   * Deletes a trigger condition record by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the trigger condition to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.triggerConditionRepository.delete({
      stepTriggerConditionId: id,
    });
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    // Ensure processTemplateStepId is provided for filtering
    query.where = { processTemplateStepId: filtersDto.processTemplateStepId };

    if (filtersDto.search) {
      query.where = [
        { conditionType: Like(`%${filtersDto.search}%`) },
        { conditionKey: Like(`%${filtersDto.search}%`) },
      ];
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
