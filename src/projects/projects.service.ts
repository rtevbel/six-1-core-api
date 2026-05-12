import { Injectable } from '@nestjs/common';
import {
  Repository,
  In,
  UpdateResult,
  DeleteResult,
  DataSource,
} from 'typeorm';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../common/runtime-v2-list-pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectEntity } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import { CreateProjectTaskDefaultStatusDto } from './project_task_statuses/dto/create-project_task_default_status.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsService } from '../events/events.service';
import { ProcessInstantiationService } from '../automation/process-instantiation.service';
import { StepOrchestratorService } from '../automation/step-orchestrator.service';
import { ConfigLifecycleService } from '../config_objects/config_lifecycle.service';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { ProjectMetaEntity } from './entities/project_meta.entity';
import {
  executeSorBoundDynamicListQuery,
  type SorBoundDynamicListContext,
} from '../config_objects/list-query/sor-bound-dynamic-list.executor';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class ProjectsService {
  private static readonly FALLBACK_CORE_FIELDS = new Set([
    'projectId',
    'tenantId',
    'name',
    'description',
    'projectIdentifier',
    'parentProjectId',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_CORE_FIELD_TO_COLUMN: Record<
    string,
    string
  > = {
    projectId: 'p.projectId',
    tenantId: 'p.tenantId',
    name: 'p.name',
    description: 'p.description',
    projectIdentifier: 'p.projectIdentifier',
    parentProjectId: 'p.parentProjectId',
    createdAt: 'p.createdAt',
    updatedAt: 'p.updatedAt',
  };

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private eventEmitter: EventEmitter2,
    private events: EventsService,
    private readonly ds: DataSource,
    private readonly processes: ProcessInstantiationService,
    private readonly orchestrator: StepOrchestratorService,
    private readonly configLifecycleService: ConfigLifecycleService,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new project record.
   * @param userId - ID of the user creating the record.
   * @param createProjectDto - Data Transfer Object containing project details.
   * @returns The created ProjectEntity.
   */
  async create(
    userId: number,
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    const maxAttempts = 4;
    const backoff = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let firstStepIdToKick: number | null = null;
    let createdProject!: ProjectEntity;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        createdProject = await this.ds.transaction(
          'READ COMMITTED',
          async (em) => {
            // 1) Project identifier
            createProjectDto.projectIdentifier =
              this.generateUniqueProjectIdentifier(createProjectDto.name);
            const processTemplateId = createProjectDto.processTemplateId || 0;
            delete (createProjectDto as any).processTemplateId;

            // 2) Create project
            const projectRepo = em.getRepository(ProjectEntity);
            const project = await projectRepo.save(
              projectRepo.create(createProjectDto),
            );

            // 3) Seed default board statuses
            const defaultStatuses = [
              {
                name: 'To Do',
                statusOrder: 1,
                color: '#7f8c8d',
                isSystem: 1,
                blocksCompletion: 1,
              },
              {
                name: 'Ready',
                statusOrder: 2,
                color: '#2980b9',
                isSystem: 1,
                blocksCompletion: 1,
              },
              {
                name: 'In Progress',
                statusOrder: 3,
                color: '#8e44ad',
                isSystem: 1,
                blocksCompletion: 1,
              },
              {
                name: 'Blocked',
                statusOrder: 4,
                color: '#c0392b',
                isSystem: 1,
                blocksCompletion: 1,
              },
              {
                name: 'Done',
                statusOrder: 5,
                color: '#27ae60',
                isSystem: 1,
                blocksCompletion: 0,
              },
            ] as const;

            const statusIdByName = new Map<string, number>();
            for (const s of defaultStatuses) {
              const res: any = await em.query(
                `INSERT INTO project_task_statuses
                 (name, tenant_id, project_id, status_order, color, is_system, blocks_completion, created_by, updated_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  s.name,
                  createProjectDto.tenantId,
                  project.projectId,
                  s.statusOrder,
                  s.color,
                  1,
                  s.blocksCompletion,
                  userId,
                  userId,
                ],
              );
              statusIdByName.set(
                s.name,
                Number(res?.insertId ?? res?.[0]?.insertId),
              );
            }

            // 4) Instantiate process (inside same TX) and create tasks
            let piId = 0;
            if (processTemplateId) {
              piId = await this.processes.instantiateProcessIn(
                em,
                processTemplateId,
                createProjectDto.tenantId,
                userId,
              );
              await projectRepo.update(project.projectId, {
                processInstanceId: piId,
              });

              // 4a) Project-level default step→status mapping
              const defaultMap: Record<string, string> = {
                pending: 'To Do',
                ready: 'Ready',
                in_progress: 'In Progress',
                completed: 'Done',
                blocked: 'Blocked',
                canceled: 'Done',
              };
              for (const [engineState, statusName] of Object.entries(
                defaultMap,
              )) {
                const taskStatusId = statusIdByName.get(statusName);
                if (!taskStatusId)
                  throw new Error(`Missing status id for ${statusName}`);
                await em.query(
                  `INSERT IGNORE INTO project_step_status_mappings
                   (project_id, step_instance_id, step_engine_state, task_status_id)
                 VALUES (?, NULL, ?, ?)`,
                  [project.projectId, engineState, taskStatusId],
                );
              }

              // 4b) Build tasks from instance steps (bulk insert)
              const instanceSteps: Array<{
                step_instance_id: number;
                name: string;
                task_type: string | null;
                step_order: number;
                status:
                  | 'pending'
                  | 'ready'
                  | 'in_progress'
                  | 'completed'
                  | 'blocked'
                  | 'canceled';
              }> = await em.query(
                `SELECT step_instance_id, name, task_type, step_order, status
                 FROM process_instance_steps
                WHERE process_instance_id = ?
                ORDER BY step_order ASC`,
                [piId],
              );

              // remember first step to kick AFTER COMMIT to avoid lock contention
              firstStepIdToKick = instanceSteps[0]?.step_instance_id ?? null;

              const statusIdByEngineState = new Map<string, number>();
              const mappingRows: Array<{
                step_engine_state: string;
                task_status_id: number;
              }> = await em.query(
                `SELECT step_engine_state, task_status_id
                 FROM project_step_status_mappings
                WHERE project_id = ? AND step_instance_id IS NULL`,
                [project.projectId],
              );
              for (const r of mappingRows)
                statusIdByEngineState.set(
                  r.step_engine_state,
                  r.task_status_id,
                );

              if (instanceSteps.length) {
                const placeholders: string[] = [];
                const values: any[] = [];
                for (const s of instanceSteps) {
                  const mappedStatusId =
                    statusIdByEngineState.get(s.status) ??
                    statusIdByName.get('To Do');
                  if (!mappedStatusId)
                    throw new Error('Failed to resolve default task status id');

                  const identifier = s.name
                    ? this.generateUniqueTaskIdentifier(s.name)
                    : `task-${s.step_instance_id}${project.projectId}`;

                  placeholders.push(
                    '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, NOW())',
                  );
                  values.push(
                    project.projectId,
                    createProjectDto.tenantId,
                    s.step_instance_id,
                    s.name,
                    identifier,
                    null,
                    'medium',
                    2.0,
                    null,
                    mappedStatusId,
                    'process',
                    null,
                    'manual',
                    4,
                    null,
                    null,
                    null,
                    null,
                    userId,
                    userId,
                  );
                }

                await em.query(
                  `INSERT INTO tasks
                   (project_id, tenant_id, step_instance_id, name, task_indentifier, description, priority, estimated_duration, parent_task_id, task_status_id, status_control, effort_hours , scheduling_mode , default_shift_hours , primary_assignee_id , team_id , start_constraint_utc , finish_constraint_utc , created_by, updated_by, created_at)
                 VALUES ${placeholders.join(',')}`,
                  values,
                );
              }
            }

            // 5) Dispatch event to create notifications (after commit)
            this.events.emit('six1-event.notification.project_created', {
              userId,
              tenantId: createProjectDto.tenantId,
              entity: { entityType: 'project', entityId: project.projectId },
              data: { projectId: project.projectId, processInstanceId: piId },
            });

            return project;
          },
        );

        // ===== COMMITTED SUCCESSFULLY =====

        // Kick orchestrator AFTER COMMIT to avoid locking against our TX
        if (firstStepIdToKick) {
          try {
            // small retry in case a peer holds a lock
            for (let i = 1; i <= 3; i++) {
              try {
                await this.orchestrator.attemptAdvance(firstStepIdToKick, {
                  cause: 'event',
                });
                break;
              } catch (e: any) {
                const code = e?.code || e?.errno;
                if (i < 3 && (code === 1205 || code === 1213)) {
                  await backoff(50 * i);
                  continue;
                }
                throw e;
              }
            }
          } catch (e) {
            // log but don't fail project creation
            console.log(
              `orchestrator kick failed for step ${firstStepIdToKick}: ${String(e)}`,
              'tttt',
            );
            //this.logger?.warn?.(`orchestrator kick failed for step ${firstStepIdToKick}: ${String(e)}`);
          }
        }

        return createdProject;
      } catch (err: any) {
        const code = err?.code || err?.errno;
        if ((code === 1205 || code === 1213) && attempt < maxAttempts) {
          await backoff(50 * attempt);
          continue;
        }
        throw err;
      }
    }

    // should never reach here
    throw new Error('create() retry loop exited unexpectedly');
  }

  /**
   * Retrieves all projects with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of projects and pagination details.
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

    const ctx: SorBoundDynamicListContext<ProjectEntity> = {
      repository: this.projectRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: 'project',
      rootAlias: 'p',
      rootEntityClass: ProjectEntity,
      denyCatalogCanonicalType: 'project',
      meta: {
        entity: ProjectMetaEntity,
        alias: 'pm',
        joinConditionSql: 'pm.projectId = p.projectId',
      },
      searchCorePropertyNames: ['name', 'description', 'projectIdentifier'],
      fallbackCoreFields: ProjectsService.FALLBACK_CORE_FIELDS,
      fallbackCoreColumnExpressions:
        ProjectsService.FALLBACK_CORE_FIELD_TO_COLUMN,
      defaultSortCoreField: 'projectId',
      tieBreakOrderBySql: 'p.projectId',
      catalogTenantResolver: (f) =>
        typeof f.tenantId === 'number' && f.tenantId > 0 ? f.tenantId : null,
      applyMandatoryScope: (qb, filters) => {
        qb.andWhere('p.tenantId = :tenantId', { tenantId: filters.tenantId });
      },
      schemaMissingForRelatedFiltersMessage:
        'Project configuration schema is required for related list filters.',
      maxPageSize: 10,
      hydrateRoots: (roots) => this.hydrateProjectsForList(roots),
    };

    const { rows: projects, total } = await executeSorBoundDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (!projects.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProjectEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: projects,
      projectRecords: projects,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  private async hydrateProjectsForList(
    roots: ProjectEntity[],
  ): Promise<ProjectEntity[]> {
    const ids = roots.map((r) => r.projectId);
    if (!ids.length) {
      return roots;
    }
    const loaded = await this.projectRepository.find({
      where: { projectId: In(ids) },
      relations: [
        'processInstance.processTemplates.descriptions',
        'tasks.linkedStepInstance',
        'taskStatuses',
      ],
    });
    const byId = new Map(loaded.map((p) => [p.projectId, p]));
    return ids.map((id) => byId.get(id)!).filter(Boolean) as ProjectEntity[];
  }

  /**
   * Retrieves a single project by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the project to retrieve.
   * @returns The ProjectEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<ProjectEntity> {
    const project = await this.projectRepository.find({
      where: { projectId: id },
      relations: ['processTemplate.descriptions', 'tasks', 'taskStatuses'],
    });

    if (!project.length) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', ProjectEntity.name),
      );
    }

    return project[0];
  }

  /**
   * Updates an existing project record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the project to update.
   * @param updateProjectDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateProjectDto: UpdateProjectDto,
  ): Promise<UpdateResult> {
    const project = await this.projectRepository.findOneByOrFail({
      projectId: id,
    });

    if (!project) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', ProjectEntity.name),
      );
    }

    if (typeof updateProjectDto.status !== 'undefined') {
      await this.configLifecycleService.validateProjectStatusTransition(
        project,
        updateProjectDto.status,
      );
    }

    // If processTemplateId is being updated, you might want to handle related logic here
    /* if (project.processTemplateId !== updateProjectDto.processTemplateId) {
      let projectTaskIds = await this.tasksService.findTaskIdsByProjectId(
        userId,
        project.projectId,
      );

      // TODO: Implement logic for handling existing project task IDs
      if (projectTaskIds.length > 0) {
        // Add your logic here
      }

      const processTemplateId = updateProjectDto.processTemplateId || 0;
      let processtemplate = await this.processTemplatesService.findOne(
        userId,
        processTemplateId,
      );

      // If process template is not found, throw an error
      if (!processtemplate.processTemplateId) {
        throw new RpcException(
          NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
            '{entity_name}',
            'Process Template',
          ),
        );
      }

      let projectId: number = project.projectId;
      // After creating the project, dispatch event to create default task statuses
      const createDto: CreateProjectTaskDefaultStatusDto = {
        tenantId: project.tenantId,
        projectId: projectId,
        createdBy: userId,
      };

      // Dispatch event to create default task statuses for the new project
      await this.dispatchCreateDefaultTaskStatusesEvent(userId, createDto);

      // Optionally, you might want to regenerate tasks based on the new process template
      await this.dispatchGenerateTasksEvent(userId, id, processTemplateId);
    }*/

    updateProjectDto.updatedBy = userId;

    return await this.projectRepository.update(id, updateProjectDto);
  }

  /**
   * Deletes a project record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the project to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    /* 
       TODO:Need to write a logic to confirm the acitivitis performed on current project,
       if there is any activity performed then avoid to delete it.
    */

    return await this.projectRepository.delete({ projectId: id });
  }

  /**
   * Builds pagination details based on filters and total count.
   *
   * @private
   * @param {FiltersDto} filtersDto
   * @param {number} total
   * @returns {{ total: number; page: number; limit: number }}
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
   * Dispatches the 'project.create_default_task_statuses' event.
   * This triggers the creation of default task statuses for a new project.
   * @param userId - ID of the user making the request.
   * @param createDto - Data transfer object containing project details.
   */
  async dispatchCreateDefaultTaskStatusesEvent(
    userId: number,
    createDto: CreateProjectTaskDefaultStatusDto,
  ): Promise<void> {
    // Emit the event asynchronously with the required payload
    await this.eventEmitter.emitAsync('project.create_default_task_statuses', {
      userId,
      data: createDto,
    });
  }

  /**
   * Dispatches the 'process.generate_tasks' event.
   * This triggers the generation of tasks for all process template steps.
   *
   * @param userId - ID of the user initiating the process.
   * @param projectId - ID of the project for which tasks are to be generated.
   * @param processTemplateId - ID of the process template containing the steps.
   */
  async dispatchGenerateTasksEvent(
    userId: number,
    projectId: number,
    processTemplateId: number,
  ): Promise<void> {
    // Emit the 'process.generate_tasks' event asynchronously with the required payload
    await this.eventEmitter.emitAsync('process.generate_tasks', {
      userId,
      projectId,
      processTemplateId,
    });
  }

  /**
   * Dispatches the 'six1-event.project_created' event.
   * This triggers the creation of notifications for a newly created project.
   * @param userId - ID of the user making the request.
   * @param createDto - Data transfer object containing project details.
   */
  async dispatchCreateProjectNotificationEvent(
    userId: number,
    createDto: ProjectEntity,
  ): Promise<void> {
    await this.events.emitWithLogs('six1-event.project_created', {
      actorId: userId,
      recipientIds: [userId],
      entity: createDto,
      data: { projectId: createDto.projectId, name: createDto.name },
    });
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
   * Generates a unique project identifier based on the project name.
   * @param {string}
   * name - The name of the project.
   * @return {string} - A unique identifier for the project.
   */
  private generateUniqueProjectIdentifier(name: string): string {
    // Normalize the project name: replace spaces with dashes and convert to lowercase
    const normalizedProjectName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    // Generate a short unique identifier (e.g., timestamp in milliseconds)
    const uniqueId = Date.now().toString(36); // Converts timestamp to a base-36 string

    // Combine normalized project name with the unique identifier (postfix)
    return `pro-${normalizedProjectName}-${uniqueId}`;
  }
}
