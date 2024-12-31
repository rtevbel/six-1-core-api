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
import { Permission } from './entities/permission.entity';
import { FiltersDto } from './dto/filters.dto';
import { AppRpcValidationPipe } from '../common/pipes/AppRpcValidation.pipe';
import { findAllResultInterface } from './interfaces/findall-result.interface';
import {
  MICROSERVICE_CREATE_PERMISSION_PATTERN,
  MICROSERVICE_FIND_ALL_PERMISSION_PATTERN,
  MICROSERVICE_FIND_ONE_PERMISSION_PATTERN,
  MICROSERVICE_REMOVE_PERMISSION_PATTERN,
  MICROSERVICE_UPDATE_PERMISSION_PATTERN,
} from './constants';
import { DeleteResult, UpdateResult } from 'typeorm';

/**
 * Permissions controller class.
 *
 * Version: 1.0.0
 *
 * Permissions controller class uses,
 * PermissionsService class to handle,
 * all gRPC calls and uses AppRpcValidationPipe,
 * to validate incoming requests' data.
 */
@Controller('pemissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Create Permission.
   *
   * Version:1.0.0.
   *
   * This controller class method uses,
   * permissionsService create method to,
   * handles the permission creation request,
   * and uses AppRpcValidationPipe to validate,
   * the payload data.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {CreatePermissionDto} createPermissionDto - Data transfer object contains,
   * permission details.
   * @returns {Promise<Permission>} - Promise that resolves into Permission object.
   */
  @MessagePattern(MICROSERVICE_CREATE_PERMISSION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createPermissionDto: CreatePermissionDto,
  ): Promise<Permission> {
    return await this.permissionsService.create(userId, createPermissionDto);
  }

  /**
   * Fetch all permissions.
   *
   * Version:1.0.0.
   *
   * This controller's method uses permission,
   * service class and AppRpcValidationPipe to,
   * validate the incoming request params and fetch,
   * permisions from database against passed filter params.
   *
   * @param {number} userId - Authenticated user ID.
   * @param  {FiltersDto} filtersDto -Data transfer object contains,
   * filter params.
   * @returns {Promise<findAllResultInterface|NotFoundException>} - Promise that resolves,
   * either into findAllResultInterface object or throws NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_PERMISSION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<findAllResultInterface | NotFoundException> {
    return await this.permissionsService.findAll(userId, filtersDto);
  }

  /**
   * Fetch one permission.
   *
   * Version:1.0.0.
   *
   * This controller method uses permission,
   * service class to fetch the permission object.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {number} id - Permission ID being fetched.
   * @returns {Promise<Permission|NotFoundException>} - Promise that resolves,
   * either into Permission object or NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_PERMISSION_PATTERN)
  async findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<Permission | NotFoundException> {
    return await this.permissionsService.findOne(userId, id);
  }

  /**
   * Update permission.
   *
   * Version:1.0.0.
   *
   * This controller method uses permssion,
   * service class and AppRpcValidationPipe ,
   * to validate and update permission entity.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {UpdatePermissionDto} updatePermissionDto - Data transfer object,
   * contains permission details.
   * @returns {Promise<UpdateResult|NotFoundException>} - Promise that resolves either into,
   * UpdateResult or throws  NotFoundException.
   */
  @MessagePattern(MICROSERVICE_UPDATE_PERMISSION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updatePermissionDto: UpdatePermissionDto,
  ): Promise<UpdateResult | NotFoundException> {
    return await this.permissionsService.update(
      userId,
      updatePermissionDto.permission_id,
      updatePermissionDto,
    );
  }

  /**
   * Remove permission.
   *
   * Version:1.0.0.
   *
   * This contoller method uses permission,
   * service class to remove the permission entity.
   *
   * @param {number} userId - Auhenticated user ID.
   * @param {number} id - Permission ID being removed.
   * @returns {Promise<DeleteResult>} - Promise that resolves into DeleteResult.
   */
  @MessagePattern(MICROSERVICE_REMOVE_PERMISSION_PATTERN)
  async remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return await this.permissionsService.remove(userId, id);
  }
}
