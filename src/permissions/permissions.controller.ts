import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload , RpcException} from '@nestjs/microservices';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionEntity } from './entities/permission.entity';
import { FiltersDto } from './dto/filters.dto';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { findAllResultInterface } from './interfaces/findall-result.interface';
import {
  V1_0_CREATE_PERMISSION_PATTERN,
  V1_0_FIND_ALL_PERMISSION_PATTERN,
  V1_0_FIND_ONE_PERMISSION_PATTERN,
  V1_0_REMOVE_PERMISSION_PATTERN,
  V1_0_UPDATE_PERMISSION_PATTERN,
} from './constants';
import { DeleteResult, UpdateResult } from 'typeorm';

/**
 * Permissions controller class.
 *
 * @version 1.0.0
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
   * @version:1.0.0.
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
  @MessagePattern(V1_0_CREATE_PERMISSION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionEntity> {
    return await this.permissionsService.create(userId, createPermissionDto);
  }

  /**
   * Fetches all permissions.
   *
   * @version:1.0.0.
   *
   * This controller's method uses permission,
   * service class and AppRpcValidationPipe to,
   * validate the incoming request params and fetch,
   * permisions from database against passed filter params.
   *
   * @param {number} userId - Authenticated user ID.
   * @param  {FiltersDto} filtersDto -Data transfer object contains,
   * filter params.
   * @returns {Promise<findAllResultInterface>} - Promise that resolves,
   * to findAllResultInterface.
   * 
   * @throws {RpcException} -Throws RpcException if no records found.
   * 
   */
  @MessagePattern(V1_0_FIND_ALL_PERMISSION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<findAllResultInterface> {
    return await this.permissionsService.findAll(userId, filtersDto);
  }

  /**
   * Fetches permission by its ID.
   *
   * @version 1.0.0
   *
   * This method uses permission,
   * service class to fetch the permission by its ID.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {number} id - Permission ID being fetched.
   * @returns {Promise<Permission>} - Promise that resolves,
   *  to PermissionEntity.
   * 
   * @throws {RpcException} -Throws RpcException if no record found.
   * 
   */
  @MessagePattern(V1_0_FIND_ONE_PERMISSION_PATTERN)
  async findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<PermissionEntity | NotFoundException> {
    return await this.permissionsService.findOne(userId, id);
  }

  /**
   * Updates permission.
   *
   * @version 1.0.0
   *
   * This method uses permssion,
   * service class and AppRpcValidationPipe ,
   * to validate and update PermissionEntity.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {UpdatePermissionDto} updatePermissionDto - Data transfer object,
   * contains permission details.
   * @returns {Promise<UpdateResul>} - Promise that resolves to,
   * UpdateResult.
   * 
   * @throws {RpcException} -Throws RpcException if no record found.
   * 
   */
  @MessagePattern(V1_0_UPDATE_PERMISSION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updatePermissionDto: UpdatePermissionDto,
  ): Promise<UpdateResult> {
    return await this.permissionsService.update(
      userId,
      updatePermissionDto.permission_id,
      updatePermissionDto,
    );
  }

  /**
   * Removes permission by its ID.
   *
   * @version 1.0.0
   *
   * This contoller method uses permission,
   * service class to remove the permission entity.
   *
   * @param {number} userId - Auhenticated user ID.
   * @param {number} id - Permission ID being removed.
   * @returns {Promise<DeleteResult>} - Promise that resolves to DeleteResult.
   */
  @MessagePattern(V1_0_REMOVE_PERMISSION_PATTERN)
  async remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return await this.permissionsService.remove(userId, id);
  }
}
