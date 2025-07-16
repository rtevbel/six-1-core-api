import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { FiltersDto } from './dto/filters.dto';
import { RoleEntity } from './entities/role.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_ROLE_PATTERN,
  MICROSERVICE_FIND_ALL_ROLE_PATTERN,
  MICROSERVICE_FIND_ONE_ROLE_PATTERN,
  MICROSERVICE_UPDATE_ROLE_PATTERN,
  MICROSERVICE_REMOVE_ROLE_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Handles the creation of a new role.
   * @param userId - ID of the user making the request.
   * @param createRoleDto - Data transfer object containing role details.
   * @returns The created role entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createRole(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createRoleDto: CreateRoleDto,
  ): Promise<RoleEntity> {
    return this.rolesService.create(userId, createRoleDto);
  }

  /**
   * Retrieves all roles based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying roles.
   * @returns A list of roles matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllRoles(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.rolesService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single role by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the role to retrieve.
   * @returns The role entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_ROLE_PATTERN)
  findOneRole(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<RoleEntity | NotFoundException> {
    return this.rolesService.findOne(userId, id);
  }

  /**
   * Updates an existing role.
   * @param userId - ID of the user making the request.
   * @param updateRoleDto - Data transfer object containing updated role details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateRole(
    @Payload('userId') userId: number,
    @Payload('data') updateRoleDto: UpdateRoleDto,
  ): Promise<UpdateResult> {
    return this.rolesService.update(
      userId,
      updateRoleDto.role_id,
      updateRoleDto,
    );
  }

  /**
   * Deletes a role by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the role to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_ROLE_PATTERN)
  removeRole(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.rolesService.remove(userId, id);
  }
}
