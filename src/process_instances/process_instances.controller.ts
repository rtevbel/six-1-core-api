import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessInstancesService } from './process_instances.service';
import { CreateProcessInstanceDto } from './dto/create-process_instance.dto';
import { UpdateProcessInstanceDto } from './dto/update-process_instance.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_PROCESS_INSTANCE_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_INSTANCE_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_INSTANCE_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';

@Controller('process-instances')
export class ProcessInstancesController {
  constructor(
    private readonly processInstancesService: ProcessInstancesService,
  ) {}

  /**
   * Handles the creation of a new process instance.
   * @param userId - ID of the user making the request.
   * @param createProcessInstanceDto - Data transfer object containing process instance details.
   * @returns The created process instance entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROCESS_INSTANCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createProcessInstance(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createProcessInstanceDto: CreateProcessInstanceDto,
  ): Promise<ProcessInstanceEntity> {
    return this.processInstancesService.create(
      userId,
      createProcessInstanceDto,
    );
  }

  /**
   * Retrieves all process instances based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying process instances.
   * @returns A list of process instances matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllProcessInstances(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.processInstancesService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single process instance by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the process instance to retrieve.
   * @returns The process instance entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_PATTERN)
  findOneProcessInstance(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<ProcessInstanceEntity | NotFoundException> {
    return this.processInstancesService.findOne(userId, id);
  }

  /**
   * Updates an existing process instance.
   * @param userId - ID of the user making the request.
   * @param updateProcessInstanceDto - Data transfer object containing updated process instance details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_INSTANCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateProcessInstance(
    @Payload('userId') userId: number,
    @Payload('data') updateProcessInstanceDto: UpdateProcessInstanceDto,
  ): Promise<UpdateResult> {
    return this.processInstancesService.update(
      userId,
      updateProcessInstanceDto.processInstanceId,
      updateProcessInstanceDto,
    );
  }

  /**
   * Deletes a process instance by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the process instance to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_INSTANCE_PATTERN)
  removeProcessInstance(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.processInstancesService.remove(userId, id);
  }
}
