import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessInstanceStepTriggerEntity } from './entities/process_instance_step_trigger_condition.entity';
import { CreateProcessInstanceStepTriggerDto } from './dto/create-process_instance_step_trigger_condition.dto';
import { UpdateProcessInstanceStepTriggerDto } from './dto/update-process_instance_step_trigger_condition.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import {  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../../common/runtime-v2-list-pagination';

@Injectable()
export class ProcessInstanceStepTriggersService {
  constructor(
    @InjectRepository(ProcessInstanceStepTriggerEntity)
    private readonly triggerRepository: Repository<ProcessInstanceStepTriggerEntity>,
  ) {}

  /**
   * Creates a new process instance step trigger.
   * @param userId - ID of the user creating the record.
   * @param createDto - Data Transfer Object containing trigger details.
   * @returns The created ProcessInstanceStepTriggerEntity.
   */
  async create(
    userId: number,
    createDto: CreateProcessInstanceStepTriggerDto,
  ): Promise<ProcessInstanceStepTriggerEntity> {
    const trigger = this.triggerRepository.create(createDto);
    return await this.triggerRepository.save(trigger);
  }

  /**
   * Retrieves all triggers with optional filters, pagination, and sorting.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of triggers and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [triggers, total] =
      await this.triggerRepository.findAndCount(findQuery);

    if (triggers.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepTriggerEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: triggers,
      processInstanceStepTriggerConditionRecords: triggers,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single trigger by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the trigger to retrieve.
   * @returns The ProcessInstanceStepTriggerEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessInstanceStepTriggerEntity> {
    const trigger = await this.triggerRepository.findOne({
      where: { triggerInstanceId: id },
    });

    if (!trigger) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessInstanceStepTrigger',
        ),
      );
    }

    return trigger;
  }

  /**
   * Updates an existing trigger record.
   * @param userId - ID of the user making the request.
   * @param id - ID of the trigger to update.
   * @param updateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessInstanceStepTriggerDto,
  ): Promise<UpdateResult> {
    const trigger = await this.triggerRepository.findOneBy({
      triggerInstanceId: id,
    });

    if (!trigger) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepTriggerEntity.name,
        ),
      );
    }

    return await this.triggerRepository.update(id, updateDto);
  }

  /**
   * Deletes a trigger record by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the trigger to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.triggerRepository.delete({
      triggerInstanceId: id,
    });
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    // Ensure processInstanceStepId is provided for filtering
    query.where = { processInstanceStepId: filtersDto.stepInstanceId };

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
    filtersDto: any,
    total: number,
  ): RuntimeV2ListPagination {
    return buildRuntimeV2ListPagination(
      filtersDto.page,
      filtersDto.limit,
      total,
      10,
    );
  }
}
