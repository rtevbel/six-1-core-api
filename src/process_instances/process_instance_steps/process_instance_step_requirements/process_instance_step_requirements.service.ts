import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessInstanceStepRequirementEntity } from './entities/process_instance_step_requirement.entity';
import { CreateProcessInstanceStepRequirementDto } from './dto/create-process_instance_step_requirement.dto';
import { UpdateProcessInstanceStepRequirementDto } from './dto/update-process_instance_step_requirement.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class ProcessInstanceStepRequirementsService {
  constructor(
    @InjectRepository(ProcessInstanceStepRequirementEntity)
    private readonly processInstanceStepRequirementRepository: Repository<ProcessInstanceStepRequirementEntity>,
  ) {}

  /**
   * Creates a new ProcessInstanceStepRequirement record.
   * @param userId - ID of the user performing the operation.
   * @param createDto - Data Transfer Object containing the data for the new record.
   * @returns The created ProcessInstanceStepRequirementEntity.
   */
  async create(
    userId: number,
    createDto: CreateProcessInstanceStepRequirementDto,
  ): Promise<ProcessInstanceStepRequirementEntity> {
    const requirement =
      this.processInstanceStepRequirementRepository.create(createDto);
    return await this.processInstanceStepRequirementRepository.save(requirement);
  }

  /**
   * Finds all ProcessInstanceStepRequirement records based on filters.
   * @param userId - ID of the user performing the operation.
   * @param filtersDto - Filters for searching and pagination.
   * @returns An object containing the records and pagination details.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [requirements, total] =
      await this.processInstanceStepRequirementRepository.findAndCount(
        findQuery,
      );

    if (requirements.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepRequirementEntity.name,
        ),
      );
    }

    return {
      processInstanceStepRequirementRecords: requirements,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Finds a single ProcessInstanceStepRequirement record by ID.
   * @param userId - ID of the user performing the operation.
   * @param id - ID of the record to find.
   * @returns The found ProcessInstanceStepRequirementEntity.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProcessInstanceStepRequirementEntity> {
    const requirement =
      await this.processInstanceStepRequirementRepository.findOne({
        where: { requirementInstanceId: id },
        relations: ['processInstanceStep', 'processTemplateStepRequirement'],
      });

    if (!requirement) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessInstanceStepRequirement',
        ),
      );
    }

    return requirement;
  }

  /**
   * Updates a ProcessInstanceStepRequirement record by ID.
   * @param userId - ID of the user performing the operation.
   * @param id - ID of the record to update.
   * @param updateDto - Data Transfer Object containing the updated data.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProcessInstanceStepRequirementDto,
  ): Promise<UpdateResult> {
    const requirement =
      await this.processInstanceStepRequirementRepository.findOneBy({
        requirementInstanceId: id,
      });

    if (!requirement) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceStepRequirementEntity.name,
        ),
      );
    }

    return await this.processInstanceStepRequirementRepository.update({requirementInstanceId:id}, updateDto);
  }

  /**
   * Deletes a ProcessInstanceStepRequirement record by ID.
   * @param userId - ID of the user performing the operation.
   * @param stepInstanceId - ID of the step instance associated with the record.
   * @param id - ID of the record to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    stepInstanceId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.processInstanceStepRequirementRepository.delete({
      requirementInstanceId: id,
      stepInstanceId: stepInstanceId,
    });
  }

  /**
   * Builds the query object for finding records based on filters.
   * @param filtersDto - Filters for searching and pagination.
   * @returns The query object for the repository.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      relations: ['processInstanceStep', 'processTemplateStepRequirement'],
    };

    query.where = { stepInstanceId: filtersDto.stepInstanceId };

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
   * @param total - Total number of records found.
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