import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessInstanceStepEntity } from './entities/process_instance_step.entity';
import { CreateProcessInstanceStepDto } from './dto/create-process_instance_step.dto';
import { UpdateProcessInstanceStepDto } from './dto/update-process_instance_step.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class ProcessInstanceStepsService {
  constructor(
    @InjectRepository(ProcessInstanceStepEntity)
    private readonly processInstanceStepRepository: Repository<ProcessInstanceStepEntity>,
  ) {}

  /**
   * Creates a new process instance step record.
   * @param userId - ID of the user creating the record.
   * @param createProcessInstanceStepDto - Data Transfer Object containing step details.
   * @returns The created ProcessInstanceStepEntity.
   */
  async create(
    userId: number,
    createProcessInstanceStepDto: CreateProcessInstanceStepDto,
  ): Promise<ProcessInstanceStepEntity> {
    const step = this.processInstanceStepRepository.create(
      createProcessInstanceStepDto,
    );
    return await this.processInstanceStepRepository.save(step);
  }

  /**
   * Retrieves all process instance steps with optional filters, pagination, and sorting.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of process instance steps and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [steps, total] =
      await this.processInstanceStepRepository.findAndCount(findQuery);

    if (steps.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepEntity.name,
        ),
      );
    }

    return {
      processInstanceStepRecords: steps,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single process instance step by ID.
   * @param userId - ID of the user making the request.
   * @param processInstanceId - ID of the associated process instance.
   * @param id - ID of the step to retrieve.
   * @returns The ProcessInstanceStepEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    processInstanceId: number,
    id: number,
  ): Promise<ProcessInstanceStepEntity> {
    const step = await this.processInstanceStepRepository.findOne({
      where: {
        stepInstanceId: id,
        processInstanceId: processInstanceId,
      },
    });

    if (!step) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace('{entity_name}', 'ProcessInstanceStep'),
      );
    }

    return step;
  }

  /**
   * Updates an existing process instance step record.
   * @param userId - ID of the user making the request.
   * @param id - ID of the step to update.
   * @param updateProcessInstanceStepDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateProcessInstanceStepDto: UpdateProcessInstanceStepDto,
  ): Promise<UpdateResult> {
    const step = await this.processInstanceStepRepository.findOneBy({
      stepInstanceId: id,
    });

    if (!step) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepEntity.name,
        ),
      );
    }

    return await this.processInstanceStepRepository.update(
      id,
      updateProcessInstanceStepDto,
    );
  }

  /**
   * Deletes a process instance step record by ID.
   * @param userId - ID of the user making the request.
   * @param processInstanceId - ID of the associated process instance.
   * @param id - ID of the step to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    processInstanceId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.processInstanceStepRepository.delete({
      stepInstanceId: id,
      processInstanceId: processInstanceId,
    });
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.where = { processInstanceId: filtersDto.processInstanceId };

    if (filtersDto.search) {
      query.where = [{ name: Like(`%${filtersDto.search}%`) }];
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
