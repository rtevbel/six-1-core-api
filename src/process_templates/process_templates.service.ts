import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessTemplateEntity } from './entities/process_template.entity';
import { ProcessTemplateDescriptionEntity } from './entities/process_template_description.entity';
import { ProcessTemplateCategoryEntity } from './entities/process_template_category.entity';
import { CreateProcessTemplateDto } from './dto/create-process_template.dto';
import { UpdateProcessTemplateDto } from './dto/update-process_template.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class ProcessTemplatesService {
  constructor(
    @InjectRepository(ProcessTemplateEntity)
    private readonly processTemplateRepository: Repository<ProcessTemplateEntity>,
    @InjectRepository(ProcessTemplateDescriptionEntity)
    private readonly processTemplateDescriptionRepository: Repository<ProcessTemplateDescriptionEntity>,
    @InjectRepository(ProcessTemplateCategoryEntity)
    private readonly processTemplateCategoryRepository: Repository<ProcessTemplateCategoryEntity>,
  ) {}

  /**
   * Creates a new process template record.
   * @param userId - ID of the user creating the record.
   * @param createProcessTemplateDto - Data Transfer Object containing process template details.
   * @returns The created ProcessTemplateEntity.
   */
  async create(
    userId: number,
    createProcessTemplateDto: CreateProcessTemplateDto,
  ): Promise<ProcessTemplateEntity> {
    console.log(
      'Creating process template with DTO:',
      createProcessTemplateDto,
    );
    return await this.processTemplateRepository.save(
      this.processTemplateRepository.create(createProcessTemplateDto),
    );
  }

  /**
   * Retrieves all process templates with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of process templates and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    // Fetch process templates and count total records
    const [processTemplates, total] =
      await this.processTemplateRepository.findAndCount(findQuery);

    // Throw exception if no records are found
    if (processTemplates.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessTemplateEntity.name,
        ),
      );
    }

    return {
      processTemplateRecords: processTemplates,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      relations: [
        'descriptions',
        'categories',
        'categories.category.descriptions',
      ],
    };
    if (filtersDto.tenantId) {
      query.where = { tenantId: filtersDto.tenantId };
    }

    // Apply search filters if provided
    if (filtersDto.search) {
      query.where = [
        {
          descriptions: {
            name: Like(`%${filtersDto.search}%`),
            description: Like(`%${filtersDto.search}%`),
          },
          'categories.category.descriptions': {
            name: Like(`%${filtersDto.search}%`),
            description: Like(`%${filtersDto.search}%`),
          },
        },
      ];
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
    filtersDto: FiltersDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }

  /**
   * Retrieves a single process template by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the process template to retrieve.
   * @returns The ProcessTemplateEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<ProcessTemplateEntity> {
    const processTemplate =
      await this.processTemplateRepository.findOne({
        where: { processTemplateId: id },
        relations: [
          'descriptions',
          'categories',
          'categories.category.descriptions',
          'steps',
          'steps.descriptions',
        ],
      });

    if (!processTemplate) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessTemplateEntity.name,
        ),
      );
    }

    return processTemplate;
  }

  /**
   * Updates an existing process template record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the process template to update.
   * @param updateProcessTemplateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateProcessTemplateDto: UpdateProcessTemplateDto,
  ): Promise<UpdateResult> {
    const processTemplate =
      await this.processTemplateRepository.findOneByOrFail({
        processTemplateId: id,
      });

    if (!processTemplate) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessTemplateEntity.name,
        ),
      );
    }

    const { descriptions, categories, ...processTemplateUpdateData } =
      updateProcessTemplateDto;

    // Handle descriptions update
    if (descriptions) {
      for (const description of descriptions) {
        if (description.processTemplateDescriptionId) {
          // Update existing description
          await this.processTemplateDescriptionRepository.update(
            description.processTemplateDescriptionId,
            description,
          );
        } else {
          // Create new description
          description.processTemplateId = id; // Ensure the processTemplateId is set for new descriptions
          await this.processTemplateDescriptionRepository.save(
            this.processTemplateDescriptionRepository.create(description),
          );
        }
      }
    }

    // Handle categories update
    if (categories) {
      await this.processTemplateCategoryRepository.delete({
        processTemplateId: id,
      });
      for (const category of categories) {
        // Create new category
        category.processTemplateId = id; // Ensure the processTemplateId is set for new categories
        await this.processTemplateCategoryRepository.save(
          this.processTemplateCategoryRepository.create(category),
        );
      }
    }
    return await this.processTemplateRepository.update(
      id,
      processTemplateUpdateData,
    );
  }

  /**
   * Deletes a process template record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the process template to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.processTemplateRepository.delete({
      processTemplateId: id,
    });
  }
}
