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

import {
  MICROSERVICE_CREATE_USER_PATTERN,
  MICROSERVICE_FIND_ALL_USER_PATTERN,
  MICROSERVICE_FIND_ONE_USER_PATTERN,
  MICROSERVICE_UPDATE_USER_PATTERN,
  MICROSERVICE_REMOVE_USER_PATTERN,
} from './constants';

@Controller('users')
@UseFilters(AppRpcExceptionsFilter)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Handles the creation of a new user.
   * @param createUserDto - Data transfer object containing user details.
   * @returns The created user entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_USER_PATTERN)
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
  removeUser(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.userService.remove(userId, id);
  }
}
