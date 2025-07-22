import {
  Controller,
  NotFoundException,
  ParseFloatPipe,
  ParseIntPipe,
  UsePipes,
  UseFilters,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SystemLanguagesService } from './system_languages.service';
import { CreateSystemLanguageDto } from './dto/create-system-language.dto';
import { UpdateSystemLanguageDto } from './dto/update-system-language.dto';
import { FiltersDto } from './dto/filters.dto';
import { SystemLanguageEntity } from './entities/system-language.entity';
import { FindAllResultInterface as FindAllLanguageResultInterface } from './interfaces/findall-result.interface';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';

import {
  MICROSERVICE_CREATE_LANGUAGE_PATTERN,
  MICROSERVICE_FIND_ALL_LANGUAGES_PATTERN,
  MICROSERVICE_FIND_ONE_LANGUAGE_PATTERN,
  MICROSERVICE_UPDATE_LANGUAGE_PATTERN,
  MICROSERVICE_REMOVE_LANGUAGE_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from 'src/common/pipes/app-rpc-validation.pipe';

@Controller('system_languages')
@UseFilters(AppRpcExceptionsFilter)
export class SystemLanguagesController {
  constructor(
    private readonly systemLanguagesService: SystemLanguagesService,
  ) {}

  /**
   * Handles the creation of a new system language.
   * @param userId - ID of the user making the request.
   * @param createSystemLanguageDto - Data transfer object containing language details.
   * @returns The created system language entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_LANGUAGE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createLanguage(
    @Payload('userId', ParseFloatPipe) userId: number,
    @Payload('data') createSystemLanguageDto: CreateSystemLanguageDto,
  ): Promise<SystemLanguageEntity> {
    return this.systemLanguagesService.create(userId, createSystemLanguageDto);
  }

  /**
   * Retrieves all system languages based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying languages.
   * @returns A list of system languages matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_LANGUAGES_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findAllLanguages(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllLanguageResultInterface | never> {
    return await this.systemLanguagesService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single system language by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the language to retrieve.
   * @returns The system language entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_LANGUAGE_PATTERN)
  findOneLanguage(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<SystemLanguageEntity | NotFoundException> {
    return this.systemLanguagesService.findOne(userId, id);
  }

  /**
   * Updates an existing system language.
   * @param userId - ID of the user making the request.
   * @param updateSystemLanguageDto - Data transfer object containing updated language details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_LANGUAGE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateLanguage(
    @Payload('userId') userId: number,
    @Payload('data') updateSystemLanguageDto: UpdateSystemLanguageDto,
  ): Promise<UpdateResult> {
    return this.systemLanguagesService.update(
      userId,
      updateSystemLanguageDto.languageId,
      updateSystemLanguageDto,
    );
  }

  /**
   * Deletes a system language by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the language to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_LANGUAGE_PATTERN)
  removeLanguage(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.systemLanguagesService.remove(userId, id);
  }
}
