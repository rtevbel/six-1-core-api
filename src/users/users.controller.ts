import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FiltersDto } from './dto/filters.dto';
import { UserEntity } from './entities/user.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcExceptionsFilter } from '../common/filters/app-rpc-exceptions.filter';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { RequirePermissions } from '../authorization/authorization.decorator';
import { TenantEmailVerificationService } from './services/tenant-email-verification.service';

import {
  MICROSERVICE_CREATE_USER_PATTERN,
  MICROSERVICE_FIND_ALL_USER_PATTERN,
  MICROSERVICE_FIND_ONE_USER_PATTERN,
  MICROSERVICE_UPDATE_USER_PATTERN,
  MICROSERVICE_REMOVE_USER_PATTERN,
  MICROSERVICE_REQUEST_TENANT_EMAIL_VERIFICATION_PATTERN,
  MICROSERVICE_VERIFY_TENANT_EMAIL_BY_TOKEN_PATTERN,
} from './constants';



@Controller('users')
@UseFilters(AppRpcExceptionsFilter)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly tenantEmailVerificationService: TenantEmailVerificationService,
  ) {}

  /**
   * Handles the creation of a new user.
   * @param createUserDto - Data transfer object containing user details.
   * @returns The created user entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_USER_PATTERN)
  @RequirePermissions('users.create')
  @UsePipes(AppRpcValidationPipe)
  createUser(
    @Payload('data') createUserDto: CreateUserDto,
  ): Promise<UserEntity> {
    return this.userService.create(createUserDto);
  }

  /**
   * Retrieves all users based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying users.
   * @returns A list of users matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_USER_PATTERN)
  @RequirePermissions('users.read')
  @UsePipes(AppRpcValidationPipe)
  findAllUsers(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.userService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single user by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the user to retrieve.
   * @returns The user entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_USER_PATTERN)
  @RequirePermissions('users.read')
  findOneUser(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<UserEntity | NotFoundException> {
    return this.userService.findOne(userId, id);
  }

  /**
   * Updates an existing user.
   * @param userId - ID of the user making the request.
   * @param updateUserDto - Data transfer object containing updated user details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_USER_PATTERN)
  @RequirePermissions('users.update')
  @UsePipes(AppRpcValidationPipe)
  updateUser(
    @Payload('userId') userId: number,
    @Payload('data') updateUserDto: UpdateUserDto,
  ): Promise<UpdateResult> {
    return this.userService.update(userId, updateUserDto.userId, updateUserDto);
  }

  /**
   * Deletes a user by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the user to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_USER_PATTERN)
  @RequirePermissions('users.delete')
  removeUser(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.userService.remove(userId, id);
  }

  /**
   * Requests a tenant email verification notification for a user.
   * Intended to be called after onboarding or when resending verification.
   */
  @MessagePattern(MICROSERVICE_REQUEST_TENANT_EMAIL_VERIFICATION_PATTERN)
  @RequirePermissions('users.update')
  @UsePipes(AppRpcValidationPipe)
  requestTenantEmailVerification(
    @Payload('data')
    payload: {
      userId: number;
      tenantName?: string | null;
    },
  ) {
    return this.tenantEmailVerificationService.requestVerification({
      userId: payload.userId,
      tenantName: payload.tenantName,
    });
  }

  /**
   * Verifies tenant email using a token and emits tenant_email_verified event.
   * This is consumed by the API gateway /auth/verify-email endpoint.
   */
  @MessagePattern(MICROSERVICE_VERIFY_TENANT_EMAIL_BY_TOKEN_PATTERN)
  verifyTenantEmailByToken(
    @Payload('data')
    payload: {
      token: string;
    },
  ) {
    return this.tenantEmailVerificationService.verifyByToken(payload.token);
  }
}
