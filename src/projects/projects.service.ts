import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectEntity } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import { ProcessTemplatesService } from '../process_templates/process_templates.service';
import { CreateProjectTaskDefaultStatusDto } from './dto/create-project_task_default_status.dto';
import {EventEmitter2} from '@nestjs/event-emitter';
import {TasksService} from "../projects/tasks/tasks.service";

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly processTemplatesService: ProcessTemplatesService,
    private readonly tasksService:TasksService,
    private eventEmitter: EventEmitter2,
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
    // Extract the project name
    const projectName = createProjectDto.name;

    // Normalize the project name: replace spaces with dashes and convert to lowercase
    const normalizedProjectName = projectName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    // Generate a short unique identifier (e.g., timestamp in milliseconds)
    const uniqueId = Date.now().toString(36); // Converts timestamp to a base-36 string
    
    // Combine normalized project name with the unique identifier (postfix)
    createProjectDto.projectIdentifier = `${normalizedProjectName}-${uniqueId}`;
    const processTemplateId = createProjectDto.processTemplateId || 0;


    if(processTemplateId){

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
    }

    const project = await this.projectRepository.save(
      this.projectRepository.create(createProjectDto),
    );
  
    // If project creation is successful and processTemplateId is not empty , dispatch events
    if(project.projectId && processTemplateId){

      let projectId:number = project.projectId;
      // After creating the project, dispatch event to create default task statuses
      const createDto: CreateProjectTaskDefaultStatusDto = {
        tenantId: createProjectDto.tenantId,
        projectId: projectId,
        createdBy: userId
      };
      
      // Dispatch event to create default task statuses for the new project
      await this.dispatchCreateDefaultTaskStatusesEvent(userId,createDto);

      // Dispatch event to generate tasks for all process template steps
      await this.dispatchGenerateTasksEvent(userId,projectId,processTemplateId);

    }else if(project.projectId){

       let projectId:number = project.projectId;
       
        // After creating the project, dispatch event to create default task statuses
        const createDto: CreateProjectTaskDefaultStatusDto = {
          tenantId: createProjectDto.tenantId,
          projectId: projectId,
          createdBy: userId
        };
        
        // Dispatch event to create default task statuses for the new project
        await this.dispatchCreateDefaultTaskStatusesEvent(userId,createDto);
    }

    return project;
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
    const findQuery = this.buildFindQuery(filtersDto);

    const [projects, total] =
      await this.projectRepository.findAndCount(findQuery);

    if (projects.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProjectEntity.name,
        ),
      );
    }

    return {
      projectRecords: projects,
      pagination: this.buildPagination(filtersDto, total),
    };
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

    // If processTemplateId is being updated, you might want to handle related logic here
    if(project.processTemplateId !== updateProjectDto.processTemplateId){

      let projectTaskIds = await this.tasksService.findTaskIdsByProjectId(userId, project.projectId);

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
      
      let projectId:number = project.projectId;
      // After creating the project, dispatch event to create default task statuses
      const createDto: CreateProjectTaskDefaultStatusDto = {
        tenantId: project.tenantId,
        projectId: projectId,
        createdBy: userId
      };
      
      // Dispatch event to create default task statuses for the new project
      await this.dispatchCreateDefaultTaskStatusesEvent(userId,createDto);
      

      // Optionally, you might want to regenerate tasks based on the new process template
      await this.dispatchGenerateTasksEvent(userId,id,processTemplateId);

    }
    
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
   * Builds a TypeORM find query based on provided filters.
   *
   * @private
   * @param {FiltersDto} filtersDto
   * @returns {Record<string, any>}
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.relations = ['processTemplate.descriptions','tasks','taskStatuses'];

    query.where = { tenantId: filtersDto.tenantId };

    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
        { description: Like(`%${filtersDto.search}%`) },
        { projectIdentifier: Like(`%${filtersDto.search}%`) },
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
   * Builds pagination details based on filters and total count.
   *
   * @private
   * @param {FiltersDto} filtersDto
   * @param {number} total
   * @returns {{ total: number; page: number; limit: number }}
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

}
