import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessTemplateStepEntity } from './entities/process_template_step.entity';
import { ProcessTemplateStepDescriptionEntity } from './entities/process_template_step_description.entity';
import { CreateProcessTemplateStepDto } from './dto/create-process_template_step.dto';
import { UpdateProcessTemplateStepDto } from './dto/update-process_template_step.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import {  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';

@Injectable()
export class ProcessTemplateStepsService {
  constructor(
    @InjectRepository(ProcessTemplateStepEntity)
    private readonly processTemplateStepRepository: Repository<ProcessTemplateStepEntity>,
    @InjectRepository(ProcessTemplateStepDescriptionEntity)
    private readonly processTemplateStepDescriptionRepository: Repository<ProcessTemplateStepDescriptionEntity>,
  ) {}

  /**
   * Creates a new process template step record.
   * @param userId - ID of the user creating the record.
   * @param createProcessTemplateStepDto - Data Transfer Object containing step details.
   * @returns The created ProcessTemplateStepEntity.
   */
  async create(
    userId: number,
    createProcessTemplateStepDto: CreateProcessTemplateStepDto,
  ): Promise<ProcessTemplateStepEntity> {
    const step = this.processTemplateStepRepository.create(
      createProcessTemplateStepDto,
    );
    return await this.processTemplateStepRepository.save(step);
  }

  /**
   * Retrieves all process template steps with optional filters, pagination, and sorting.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of process template steps and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    // Fetch process template steps and count total records
    const [steps, total] =
      await this.processTemplateStepRepository.findAndCount(findQuery);

    // Throw exception if no records are found
    if (steps.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: steps,
      processTemplateStepRecords: steps,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single process template step by ID.
   * @param userId - ID of the user making the request.
   * @param processTemplateId - ID of the associated process template.
   * @param id - ID of the step to retrieve.
   * @returns The ProcessTemplateStepEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    processTemplateId: number,
    id: number,
  ): Promise<ProcessTemplateStepEntity> {
    const step = await this.processTemplateStepRepository.findOne({
      where: {
        processTemplateStepId: id,
        processTemplateId: processTemplateId,
      },
      relations: ['descriptions'],
    });

    if (!step) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace('{entity_name}', 'ProcessTemplateStep'),
      );
    }

    return step;
  }

  /**
   * Updates an existing process template step record.
   * @param userId - ID of the user making the request.
   * @param id - ID of the step to update.
   * @param updateProcessTemplateStepDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateProcessTemplateStepDto: UpdateProcessTemplateStepDto,
  ): Promise<UpdateResult> {
    const step = await this.processTemplateStepRepository.findOneBy({
      processTemplateStepId: id,
    });

    if (!step) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepEntity.name,
        ),
      );
    }

    const { descriptions, ...stepUpdateData } = updateProcessTemplateStepDto;

    // Handle descriptions update
    if (descriptions) {
      for (const description of descriptions) {
        if (description.processTemplateStepDescriptionId) {
          // Update existing description
          await this.processTemplateStepDescriptionRepository.update(
            description.processTemplateStepDescriptionId,
            description,
          );
        } else {
          // Create new description
          description.processTemplateStepId = id; // Ensure the step ID is set for new descriptions
          await this.processTemplateStepDescriptionRepository.save(
            this.processTemplateStepDescriptionRepository.create(description),
          );
        }
      }
    }

    return await this.processTemplateStepRepository.update(id, stepUpdateData);
  }

  /**
   * Deletes a process template step record by ID.
   * @param userId - ID of the user making the request.
   * @param processTemplateId - ID of the associated process template.
   * @param id - ID of the step to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    processTemplateId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.processTemplateStepRepository.delete({
      processTemplateStepId: id,
      processTemplateId: processTemplateId,
    });
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      relations: ['descriptions'],
    };

    // Mandatory filter by processTemplateId
    query.where = { processTemplateId: filtersDto.processTemplateId };

    // Apply search filters if provided
    if (filtersDto.search) {
      query.where = [{ name: Like(`%${filtersDto.search}%`) }];
    }

    // Apply sorting if provided
    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    // Apply pagination if limit is provided
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

  /**
   * Retrieves all process template steps by process template id.
   * @param userId - ID of the user making the request.
   * @param processTemplateId - ID of the associated process template.
   * @returns An object containing the list of process template steps.
   * @throws RpcException if no records match the filters.
   */
  async findAllByProcessTemplateId(
    userId: number,
    processTemplateId: number,
  ): Promise<ProcessTemplateStepEntity[]> {
    // Fetch process template steps
    const steps = await this.processTemplateStepRepository.find({
      where: { processTemplateId: processTemplateId },
      relations: ['descriptions'], // Include the 'descriptions' relationship
    });

    // Throw exception if no records are found
    if (steps.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepEntity.name,
        ),
      );
    }

    return steps;
  }
}
