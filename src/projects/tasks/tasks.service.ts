import { Injectable } from '@nestjs/common';
import { Repository, In, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskEntity } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import { ProcessTemplateStepsService } from '../../process_templates/process_template_steps/process_template_steps.service';
import { ProjectTaskStatusesService } from '../project_task_statuses/project_task_statuses.service';
import { ConfigLifecycleService } from '../../config_objects/config_lifecycle.service';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { TaskMetaEntity } from './entities/task_meta.entity';
import {
  executeSorBoundDynamicListQuery,
  type SorBoundDynamicListContext,
} from '../../config_objects/list-query/sor-bound-dynamic-list.executor';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TasksService {
  private static readonly FALLBACK_CORE_FIELDS = new Set([
    'taskId',
    'projectId',
    'tenantId',
    'taskIdentifier',
    'name',
    'description',
    'taskStatusId',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_CORE_FIELD_TO_COLUMN: Record<
    string,
    string
  > = {
    taskId: 't.taskId',
    projectId: 't.projectId',
    tenantId: 't.tenantId',
    taskIdentifier: 't.taskIdentifier',
    name: 't.name',
    description: 't.description',
    taskStatusId: 't.taskStatusId',
    createdAt: 't.createdAt',
    updatedAt: 't.updatedAt',
  };

  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly processTemplateStepsService: ProcessTemplateStepsService,
    private readonly projectTaskStatusesService: ProjectTaskStatusesService,
    private readonly configLifecycleService: ConfigLifecycleService,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new task record for a specific project.
   * @param userId - ID of the user creating the record.
   * @param createTaskDto - Data Transfer Object containing task details.
   * @returns The created TaskEntity.
   */
  async create(
    userId: number,
    createTaskDto: CreateTaskDto,
  ): Promise<TaskEntity> {
    // Assign the userId to createdBy and updatedBy fields
    createTaskDto.taskIdentifier = this.generateUniqueTaskIdentifier(
      createTaskDto.name,
    );

    return await this.taskRepository.save(
      this.taskRepository.create(createTaskDto),
    );
  }

  /**
   * Retrieves all tasks for a specific project with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of tasks and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const ctx: SorBoundDynamicListContext<TaskEntity> = {
      repository: this.taskRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: 'task',
      rootAlias: 't',
      rootEntityClass: TaskEntity,
      denyCatalogCanonicalType: 'task',
      meta: {
        entity: TaskMetaEntity,
        alias: 'tm',
        joinConditionSql: 'tm.taskId = t.taskId',
      },
      searchCorePropertyNames: ['name', 'description', 'taskIdentifier'],
      fallbackCoreFields: TasksService.FALLBACK_CORE_FIELDS,
      fallbackCoreColumnExpressions: TasksService.FALLBACK_CORE_FIELD_TO_COLUMN,
      defaultSortCoreField: 'taskId',
      tieBreakOrderBySql: 't.taskId',
      catalogTenantResolver: (f) =>
        typeof f.tenantId === 'number' && f.tenantId > 0 ? f.tenantId : null,
      applyMandatoryScope: (qb, filters) => {
        const f = filters as FiltersDto;
        qb.andWhere('t.projectId = :projectId', { projectId: f.projectId });
      },
      schemaMissingForRelatedFiltersMessage:
        'Task configuration schema is required for related list filters.',
      maxPageSize: 10,
      hydrateRoots: (roots) => this.hydrateTasksForList(roots),
    };

    const { rows: tasks, total } = await executeSorBoundDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (!tasks.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TaskEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: tasks,
      taskRecords: tasks,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  private async hydrateTasksForList(
    roots: TaskEntity[],
  ): Promise<TaskEntity[]> {
    const ids = roots.map((r) => r.taskId);
    if (!ids.length) {
      return roots;
    }
    const loaded = await this.taskRepository.find({
      where: { taskId: In(ids) },
      relations: ['project', 'taskStatus'],
    });
    const byId = new Map(loaded.map((t) => [t.taskId, t]));
    return ids.map((id) => byId.get(id)!).filter(Boolean) as TaskEntity[];
  }

  /**
   * Retrieves a single task by ID for a specific project.
   * @param userId - ID of the user requesting the data.
   * @param projectId - ID of the project the task belongs to.
   * @param id - ID of the task to retrieve.
   * @returns The TaskEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    projectId: number,
    id: number,
  ): Promise<TaskEntity> {
    const task = await this.taskRepository.findOneByOrFail({
      taskId: id,
      projectId,
    });

    if (!task) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', TaskEntity.name),
      );
    }

    return task;
  }

  /**
   * Updates an existing task record for a specific project.
   * @param userId - ID of the user updating the record.
   * @param projectId - ID of the project the task belongs to.
   * @param id - ID of the task to update.
   * @param updateTaskDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    projectId: number,
    id: number,
    updateTaskDto: UpdateTaskDto,
  ): Promise<UpdateResult> {
    const task = await this.taskRepository.findOneByOrFail({
      taskId: id,
      projectId: projectId,
    });

    if (!task) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', TaskEntity.name),
      );
    }

    if (typeof updateTaskDto.taskStatusId !== 'undefined') {
      await this.configLifecycleService.validateTaskStatusTransition(
        task,
        updateTaskDto.taskStatusId,
      );
    }

    updateTaskDto.updatedBy = userId;

    return await this.taskRepository.update(id, updateTaskDto);
  }

  /**
   * Deletes a task record by ID for a specific project.
   * @param userId - ID of the user deleting the record.
   * @param projectId - ID of the project the task belongs to.
   * @param id - ID of the task to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    projectId: number,
    id: number,
  ): Promise<DeleteResult> {
    return await this.taskRepository.delete({
      taskId: id,
      projectId: projectId,
    });
  }

  /**
   * Builds pagination details based on filters and total count.
   * @param filtersDto - Filters for pagination.
   * @param total - Total number of records matching the filters.
   * @returns An object containing pagination details.
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
   * Generates tasks for a project based on the steps defined in a process template.
   * @param userId - ID of the user initiating the task generation.
   * @param projectId - ID of the project for which tasks are to be generated.
   * @param processTemplateId - ID of the process template containing the steps.
   */
  async generateTasksForProcessTemplateSteps(
    userId: number,
    projectId: number,
    processTemplateId: number,
  ) {
    // Fetch the process template steps from the service
    const templateSteps =
      await this.processTemplateStepsService.findAllByProcessTemplateId(
        userId,
        processTemplateId,
      );

    // Fetch the default task status for the project
    const taskDefaultStatus =
      await this.projectTaskStatusesService.findOneByProjectId(
        userId,
        projectId,
      );

    if (templateSteps.length !== 0) {
      // Iterate over each template step and generate a task
      for (const step of templateSteps) {
        const taskDto: CreateTaskDto = {
          projectId,
          tenantId: 1,
          taskIdentifier: this.generateUniqueTaskIdentifier(
            step.descriptions[0].name,
          ), // Unique identifier for the task
          name: `Task for ${step.descriptions[0].name}`, // Name of the task
          description: `${step.descriptions[0].description}`, // Optional description
          taskStatusId: taskDefaultStatus?.projectTaskStatusId ?? 1, // Default task status ID (e.g., 'Pending')
          stepInstanceId: 1, // Process template step ID
          statusControl: 'manual', // Default status control
          priority: 'medium', // Default priority
          estimatedDuration: 2.0, // Default estimated duration (in hours)
          parentTaskId: undefined, // No parent task by default
          createdBy: userId, // ID of the user creating the task
          updatedBy: userId, // ID of the user creating the task
        };
        await this.create(userId, taskDto);
      }
    }
    console.log('Default tasks created');
  }

  /**
   * Retrieves an array of task IDs associated with a specific project.
   *
   * @param {number} userId - The ID of the user requesting the task IDs.
   * @param {number} projectId - The ID of the project for which to find task IDs.
   * @returns A promise that resolves to an array of TaskEntity objects containing the task IDs.
   */
  async findTaskIdsByProjectId(
    userId: number,
    projectId: number,
  ): Promise<TaskEntity[]> {
    const taskIds = await this.taskRepository.find({
      select: ['taskId'],
      where: {
        projectId: projectId,
      },
    });

    return taskIds;
  }

  /**
   * Generates a unique task identifier based on the task name.
   * @param {string}
   * name - The name of the task.
   * @return {string} - A unique identifier for the task.
   */
  private generateUniqueTaskIdentifier(name: string): string {
    const normalizedTaskName = name.trim().toLowerCase().replace(/\s+/g, '-');

    // Generate a short unique identifier (e.g., timestamp in milliseconds)
    const uniqueId = Date.now().toString(36); // Converts timestamp to a base-36 string

    return `task-${normalizedTaskName}-${uniqueId}`; // Unique identifier for the task
  }

  /**
   * Retrieves a single task by ID for a specific project.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the task to retrieve.
   * @returns The TaskEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOneByTaskId(userId: number, id: number): Promise<TaskEntity> {
    const task = await this.taskRepository.findOneByOrFail({
      taskId: id,
    });

    if (!task) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', TaskEntity.name),
      );
    }

    return task;
  }
}
