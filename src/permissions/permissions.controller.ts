import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { FiltersDto } from './dto/filters.dto';
import { PermissionEntity } from './entities/permission.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_PERMISSION_PATTERN,
  MICROSERVICE_FIND_ALL_PERMISSION_PATTERN,
  MICROSERVICE_FIND_ONE_PERMISSION_PATTERN,
  MICROSERVICE_UPDATE_PERMISSION_PATTERN,
  MICROSERVICE_REMOVE_PERMISSION_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Handles the creation of a new permission.
   * @param userId - ID of the user making the request.
   * @param createPermissionDto - Data transfer object containing permission details.
   * @returns The created permission entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_PERMISSION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createPermission(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionEntity> {
    return this.permissionsService.create(userId, createPermissionDto);
  }

  /**
   * Retrieves all permissions based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying permissions.
   * @returns A list of permissions matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PERMISSION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllPermissions(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.permissionsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single permission by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the permission to retrieve.
   * @returns The permission entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PERMISSION_PATTERN)
  findOnePermission(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<PermissionEntity | NotFoundException> {
    return this.permissionsService.findOne(userId, id);
  }

  /**
   * Updates an existing permission.
   * @param userId - ID of the user making the request.
   * @param updatePermissionDto - Data transfer object containing updated permission details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PERMISSION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updatePermission(
    @Payload('userId') userId: number,
    @Payload('data') updatePermissionDto: UpdatePermissionDto,
  ): Promise<UpdateResult> {
    return this.permissionsService.update(
      userId,
      updatePermissionDto.permission_id,
      updatePermissionDto,
    );
  }

  /**
   * Deletes a permission by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the permission to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PERMISSION_PATTERN)
  removePermission(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.permissionsService.remove(userId, id);
  }
}
