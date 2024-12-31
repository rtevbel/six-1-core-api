import {
  Controller,
  NotFoundException,
  ParseFloatPipe,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { FiltersDto } from './dto/filters.dto';
import { Role } from './entities/role.entity';
import { findAllResultInterface } from './interfaces/findall-result.interface';
import {
  MICROSERVICE_CREATE_ROLE_PATTERN,
  MICROSERVICE_FIND_ALL_ROLES_PATTERN,
  MICROSERVICE_FIND_ONE_ROLE_PATTERN,
  MICROSERVICE_UPDATE_ROLE_PATTERN,
  MICROSERVICE_REMOVE_ROLE_PATTERN,
} from './constants';
import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from 'src/common/pipes/AppRpcValidation.pipe';

/**
 * Roles' controller class.
 *
 * Version:1.0.0.
 *
 * This roles controller class uses rolesService and
 * AppExceptionFilter to validate and process all user role's,
 * gRPC calls.
 */
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Create role.
   *
   * Version:1.0.0.
   *
   * This controller method uses AppRpcValidationPipe and
   * rolesService class to validate and create new role.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {CreateRoleDto} createRoleDto - Data transfer object contains,
   * all details of new role.
   * @returns {Promise<Role>} -Promise that resolves to Role object.
   */
  @MessagePattern(MICROSERVICE_CREATE_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  create(
    @Payload('userId', ParseFloatPipe) userId: number,
    @Payload('data') createRoleDto: CreateRoleDto,
  ): Promise<Role> {
    return this.rolesService.create(userId, createRoleDto);
  }

  /**
   * Fetch all roles.
   *
   * Version:1.0.0.
   *
   * This controller method uses AppRpcValidationPipe,
   * and rolesService class to validate filter params,
   * and returns matched role records with pagination.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {FiltersDto} filtersDto -Data transfer object contains,
   * filter params.
   * @returns {Promise<findAllResultInterface|NotFoundException>} -Promise that resolves either into,
   * findAllResultInterface or  NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_ROLES_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<findAllResultInterface | NotFoundException> {
    return this.rolesService.findAll(userId, filtersDto);
  }

  /**
   * Fetch role.
   *
   * Version:1.0.0.
   *
   * This controller method uses rolesService,
   * class to fetch role by its ID.
   *
   * @param {number} userId -Authenticated user ID.
   * @param  {number} id - Role ID being fetched.
   * @returns {Promise<Role|NotFoundException>} - Promise that resolves into either,
   *  Role or NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_ROLE_PATTERN)
  findOne(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<Role | NotFoundException> {
    return this.rolesService.findOne(userId, id);
  }

  /**
   * Update role.
   *
   * Version:1.0.0.
   *
   * This controller method uses rolesService,
   * class and AppRpcValidationPipe to validate,
   * and update role details.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {UpdateRoleDto} updateRoleDto - Data transfer object contains,
   * role details to update.
   * @returns {Promise<UpdateResult|NotFoundException>} -Promise that resolves into either,
   * UpdateResult or NotFoundException.
   */
  @MessagePattern(MICROSERVICE_UPDATE_ROLE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  update(
    @Payload('userId') userId: number,
    @Payload('data') updateRoleDto: UpdateRoleDto,
  ): Promise<UpdateResult | NotFoundException> {
    return this.rolesService.update(
      userId,
      updateRoleDto.role_id,
      updateRoleDto,
    );
  }

  /**
   * Remove role.
   *
   * Version:1.0.0.
   *
   * This method uses rolesService class to,
   * delete role entity.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -Role ID being deleted.
   * @returns {Promise<DeleteResult>} -Promise that resolves,
   * into DeleteResult.
   */
  @MessagePattern(MICROSERVICE_REMOVE_ROLE_PATTERN)
  remove(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.rolesService.remove(userId, id);
  }
}
