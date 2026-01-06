import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessTemplateStepRequirementEntity } from './entities/process_template_step_requirement.entity';
import { CreateProcessTemplateStepRequirementDto } from './dto/create-process_template_step_requirement.dto';
import { UpdateProcessTemplateStepRequirementDto } from './dto/update-process_template_step_requirement.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class ProcessTemplateStepRequirementsService {
  constructor(
    @InjectRepository(ProcessTemplateStepRequirementEntity)
    private readonly processTemplateStepRequirementRepository: Repository<ProcessTemplateStepRequirementEntity>,
  ) {}

  /**
   * Creates a new process template step requirement record.
   * @param userId - ID of the user creating the record.
   * @param createDto - Data Transfer Object containing requirement details.
   * @returns The created ProcessTemplateStepRequirementEntity.
   */
  async create(
    userId: number,
    createDto: CreateProcessTemplateStepRequirementDto,
  ): Promise<ProcessTemplateStepRequirementEntity> {
    const requirement =
      this.processTemplateStepRequirementRepository.create(createDto);
    return await this.processTemplateStepRequirementRepository.save(
      requirement,
    );
  }

  /**
   * Retrieves all process template step requirements with optional filters, pagination, and sorting.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of requirements and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [requirements, total] =
      await this.processTemplateStepRequirementRepository.findAndCount(
        findQuery,
      );

    // Return empty array instead of throwing exception when no records found
    // This allows the frontend to handle empty states gracefully
    return {
      processTemplateStepRequirementRecords: requirements || [],
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single process template step requirement by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the requirement to retrieve.
   * @returns The ProcessTemplateStepRequirementEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessTemplateStepRequirementEntity> {
    const requirement =
      await this.processTemplateStepRequirementRepository.findOne({
        where: { processTemplateStepRequirementId: id },
        relations: ['processTemplateStep'],
      });

    if (!requirement) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessTemplateStepRequirement',
        ),
      );
    }

    return requirement;
  }

  /**
   * Updates an existing process template step requirement record.
   * @param userId - ID of the user making the request.
   * @param id - ID of the requirement to update.
   * @param updateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessTemplateStepRequirementDto,
  ): Promise<UpdateResult> {
    const requirement =
      await this.processTemplateStepRequirementRepository.findOneBy({
        processTemplateStepRequirementId: id,
      });

    if (!requirement) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateStepRequirementEntity.name,
        ),
      );
    }

    return await this.processTemplateStepRequirementRepository.update(id, {
      ...updateDto,
      updatedBy: userId,
    });
  }

  /**
   * Deletes a process template step requirement record by ID.
   * @param userId - ID of the user making the request.
   * @param processTemplateStepId - ID of the process template step the requirement belongs to.
   * @param id - ID of the requirement to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    processTemplateStepId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.processTemplateStepRequirementRepository.delete({
      processTemplateStepRequirementId: id,
      processTemplateStepId: processTemplateStepId,
    });
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      relations: ['processTemplateStep'],
    };

    query.where = { processTemplateStepId: filtersDto.processTemplateStepId };

    if (filtersDto.search) {
      query.where = [
        { requirementType: Like(`%${filtersDto.search}%`) },
        { requirementKey: Like(`%${filtersDto.search}%`) },
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
