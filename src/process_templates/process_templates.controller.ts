import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplatesService } from './process_templates.service';
import { CreateProcessTemplateDto } from './dto/create-process_template.dto';
import { UpdateProcessTemplateDto } from './dto/update-process_template.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessTemplateEntity } from './entities/process_template.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_PROCESS_TEMPLATE_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_TEMPLATE_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_TEMPLATE_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';

@Controller('process-templates')
export class ProcessTemplatesController {
  constructor(
    private readonly processTemplatesService: ProcessTemplatesService,
  ) {}

  /**
   * Handles the creation of a new process template.
   * @param userId - ID of the user making the request.
   * @param createProcessTemplateDto - Data transfer object containing process template details.
   * @returns The created process template entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PROCESS_TEMPLATE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createProcessTemplate(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createProcessTemplateDto: CreateProcessTemplateDto,
  ): Promise<ProcessTemplateEntity> {
    console.log(createProcessTemplateDto.descriptions, 'descriptions in controller');
    return this.processTemplatesService.create(
      userId,
      createProcessTemplateDto,
    );
  }

  /**
   * Retrieves all process templates based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying process templates.
   * @returns A list of process templates matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllProcessTemplates(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.processTemplatesService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single process template by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the process template to retrieve.
   * @returns The process template entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_PATTERN)
  findOneProcessTemplate(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<ProcessTemplateEntity | NotFoundException> {
    return this.processTemplatesService.findOne(userId, id);
  }

  /**
   * Updates an existing process template.
   * @param userId - ID of the user making the request.
   * @param updateProcessTemplateDto - Data transfer object containing updated process template details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_TEMPLATE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateProcessTemplate(
    @Payload('userId') userId: number,
    @Payload('data') updateProcessTemplateDto: UpdateProcessTemplateDto,
  ): Promise<UpdateResult> {
    return this.processTemplatesService.update(
      userId,
      updateProcessTemplateDto.processTemplateId,
      updateProcessTemplateDto,
    );
  }

  /**
   * Deletes a process template by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the process template to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_TEMPLATE_PATTERN)
  removeProcessTemplate(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.processTemplatesService.remove(userId, id);
  }
}
