import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskEntity } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {ProcessTemplateStepsService} from "../../process_templates/process_template_steps/process_template_steps.service";
import {ProjectTaskStatusesService} from "../project_task_statuses/project_task_statuses.service"

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly processTemplateStepsService: ProcessTemplateStepsService,
    private readonly projectTaskStatusesService: ProjectTaskStatusesService,
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
    createTaskDto.taskIdentifier =  this.generateUniqueTaskIdentifier(createTaskDto.name);
    
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
    const findQuery = this.buildFindQuery(filtersDto);

    const [tasks, total] = await this.taskRepository.findAndCount(findQuery);

    if (tasks.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TaskEntity.name,
        ),
      );
    }

    return {
      taskRecords: tasks,
      pagination: this.buildPagination(filtersDto, total),
    };
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
   * Builds a TypeORM find query based on provided filters and project ID.
   * @param projectId - ID of the project the tasks belong to.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object for TypeORM.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.relations = ['project','taskStatus'];
    query.where = { projectId: filtersDto.projectId };

    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
        { description: Like(`%${filtersDto.search}%`) },
        { taskIdentifier: Like(`%${filtersDto.search}%`) },
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
   * @param filtersDto - Filters for pagination.
   * @param total - Total number of records matching the filters.
   * @returns An object containing pagination details.
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
   * Generates tasks for a project based on the steps defined in a process template.
   * @param userId - ID of the user initiating the task generation.
   * @param projectId - ID of the project for which tasks are to be generated.
   * @param processTemplateId - ID of the process template containing the steps.
   */
  async generateTasksForProcessTemplateSteps(userId:number,projectId:number,processTemplateId:number){
 
       // Fetch the process template steps from the service
       const templateSteps = await this.processTemplateStepsService.findAllByProcessTemplateId(userId,processTemplateId);

       // Fetch the default task status for the project
       const  taskDefaultStatus =  await this.projectTaskStatusesService.findOneByProjectId(userId,projectId);

       if(templateSteps.length !== 0){

          // Iterate over each template step and generate a task
          for (const step of templateSteps) {

            const taskDto: CreateTaskDto = {
              projectId,
              taskIdentifier: this.generateUniqueTaskIdentifier(step.descriptions[0].name), // Unique identifier for the task
              name: `Task for ${step.descriptions[0].name}`, // Name of the task
              description: `${step.descriptions[0].description}`, // Optional description
              taskStatusId: taskDefaultStatus?.projectTaskStatusId ?? 1, // Default task status ID (e.g., 'Pending')
              processTemplateStepId: step.processTemplateStepId, // Process template step ID
              priority: 'medium', // Default priority
              estimatedDuration: 2.0, // Default estimated duration (in hours)
              parentTaskId: undefined, // No parent task by default
              createdBy:userId, // ID of the user creating the task
              updatedBy:userId, // ID of the user creating the task
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
   async findTaskIdsByProjectId(userId:number , projectId:number):Promise<TaskEntity[]>{

      const taskIds = await this.taskRepository.find({
        select:['taskId'],
        where:{
          projectId:projectId
        }
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

    const normalizedTaskName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

      // Generate a short unique identifier (e.g., timestamp in milliseconds)
      const uniqueId = Date.now().toString(36); // Converts timestamp to a base-36 string

      return `task-${normalizedTaskName}-${uniqueId}`; // Unique identifier for the task

   }

}
