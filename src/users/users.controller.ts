import {
  Controller,
  Inject,
  UsePipes,
  ParseIntPipe,
  UseFilters,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ClientProxy,
  MessagePattern,
  Payload,
  RmqContext,
  Ctx,
} from '@nestjs/microservices';
import { UserEntity } from './entities/user.entity';
import { AppRpcValidationPipe } from '../common/pipes/AppRpcValidation.pipe';
import { AppExceptionFilter } from '../common/filters/AppException.filter';
import {
  MICROSERVICE_CREATE_USER_PATTERN,
  MICROSERVICE_FIND_ALL_USER_PATTERN,
  MICROSERVICE_FIND_ONE_USER_PATTERN,
  MICROSERVICE_REMOVE_USER_PATTERN,
  MICROSERVICE_UPDATE_USER_PATTERN,
  MICROSERVICE_SAVE_USER_PASSWORD_PATTERN,
  MICROSERVICE_FIND_ALL_USER_PASSWORDS_PATTERN,
  MICROSERVICE_FIND_ONE_USER_PASSWORD_PATTERN,
  MICROSERVICE_FIND_ALL_USER_LOGIN_TOKENS_PATTERN,
  MICROSERVICE_FIND_ONE_USER_LOGIN_TOKEN_PATTERN,
  MICROSERVICE_REMOVE_USER_LOGIN_TOKEN_PATTERN,
  MICROSERVICE_UPDATE_USER_LOGIN_TOKEN_PATTERN,
  MICROSERVICE_SAVE_USER_LOGIN_TOKEN_PATTERN,
} from './constants';
import { FindAllResultInterface } from './interfaces/find-all-result.interface';
import { FiltersDto } from './dto/filters.dto';
import { DeleteResult, UpdateResult } from 'typeorm';
import { UserPasswordsService } from '../user-passwords/user-passwords.service';
import { UserLoginTokensService } from '../user-login-tokens/user-login-tokens.service';
import { CreatePasswordDto } from '../user-passwords/dto/create-password.dto';
import { UserPasswordEntity } from '../user-passwords/entities/user-password.entity';
import { FiltersDto as UserPasswordFilterDto } from '../user-passwords/dto/filters.dto';
import { FindAllResultInterface as FindUserPasswordAllResultInterface } from '../user-passwords/interfaces/find-all-result.interface';
import { FindOneByDto as FindOneByUserPasswordDto } from '../user-passwords/dto/find-one-by.dto';
import { CreateUserLoginTokenDto } from '../user-login-tokens/dto/create-user-login-token.dto';
import { UpdateUserLoginTokenDto } from '../user-login-tokens/dto/update-user-login-token.dto';
import { FiltersDto as UserLoginTokenFiltersDto } from '../user-login-tokens/dto/filters.dto';
import { UserLoginTokenEntity } from '../user-login-tokens/entities/user-login-token.entity';
import { FindAllResultInterface as UserLoginTokenFindAllResultInterface } from '../user-login-tokens/interfaces/find-all-result.interface';

/**
 * UsersController handles user-related operations in the microservice architecture.
 * This controller processes user-related requests via message patterns and communicates
 * with the `UsersService` for business logic.
 *
 * @category Controllers
 */
@Controller('users')
@UseFilters(AppExceptionFilter)
export class UsersController {
  /**
   * Initializes the UsersController.
   *
   * Version:1.0.0.
   *
   * @param {UsersService} usersService - Service containing business logic for user-related operations.
   * @param {ClientProxy} client - ClientProxy instance for messaging communication.
   */
  constructor(
    private usersService: UsersService,
    private userPasswordsService: UserPasswordsService,
    private userLoginTokensService: UserLoginTokensService,
    @Inject('USER_SERVICE') private client: ClientProxy,
  ) {}

  /**
   * Handles the creation of a new user.
   *
   * Version:1.0.0.
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {CreateUserDto} createUserDto - Data Transfer Object containing user creation data.
   * @param {RmqContext} context - RabbitMQ message context.
   * @returns {Promise<UserEntity>} -Promise that resolves to created user Entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_USER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createUserDto: CreateUserDto,
    @Ctx() context: RmqContext,
  ): Promise<UserEntity> {
    return this.usersService.create(userId, createUserDto);
  }

  /**
   * Fetches all users based on filters.
   *
   * Version:1.0.0.
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {FiltersDto} filtersDto - Filters to apply for fetching users.
   * @returns {Promise<FindAllResultInterface | NotFoundException>} -Promise that resolves to either a,
   * FindAllResultInterface or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_USER_PATTERN)
  findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | NotFoundException> {
    return this.usersService.findAll(userId, filtersDto);
  }

  /**
   * Fetches a single user by ID.
   *
   * Version:1.0.0.
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {number} id - ID of the user to fetch.
   * @returns { Promise<UserEntity | NotFoundException>} -Promise that resolves to either a,
   * UserEntity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_USER_PATTERN)
  findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<UserEntity | NotFoundException> {
    return this.usersService.findOne(userId, id);
  }

  /**
   * Updates an existing user.
   *
   * Version:1.0.0.
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {UpdateUserDto} updateUserDto - Data Transfer Object containing user update data.
   * @returns {Promise<UpdateResult | NotFoundException>} -Promise that resolves to either a,
   * UpdateResult or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_UPDATE_USER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateUserDto: UpdateUserDto,
  ): Promise<UpdateResult | NotFoundException> {
    return this.usersService.update(
      userId,
      updateUserDto.user_id,
      updateUserDto,
    );
  }

  /**
   * Deletes a user by ID.
   *
   * Version:1.0.0.
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {number} id - ID of the user to delete.
   * @returns {Promise<DeleteResult>} -Promise that resolves to DeleteResult.
   */
  @MessagePattern(MICROSERVICE_REMOVE_USER_PATTERN)
  remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.usersService.remove(userId, id);
  }

  /**
   * Saves user password.
   *
   * Version:1.0.0.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {CreatePasswordDto} createPasswordDto -Data transfer object contains,
   * user password details.
   * @returns {Promise<UserPasswordEntity>} -Promise that resolves to UserPasswordEntity.
   */
  @MessagePattern(MICROSERVICE_SAVE_USER_PASSWORD_PATTERN)
  saveUserPassword(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createPasswordDto: CreatePasswordDto,
  ): Promise<UserPasswordEntity> {
    return this.userPasswordsService.create(userId, createPasswordDto);
  }

  /**
   * Fetch one user password by its ID.
   *
   * Version:1.0.0.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -ID of user password to fetch.
   * @returns {Promise<UserPasswordEntity|NotFoundException>} -Promise that,
   * resolves to either a UserPasswordEntity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_USER_PASSWORD_PATTERN)
  findOneUserPassword(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<UserPasswordEntity | NotFoundException> {
    return this.userPasswordsService.findOne(userId, id);
  }

  /**
   * Fetch user passwords based on filters.
   *
   * Version:1.0.0.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {UserPasswordFilterDto} userPasswordFilterDto -Data transfer,
   * object contains filters data.
   * @returns {Promise<FindUserPasswordAllResultInterface|NotFoundException>} -Promise that resolves,
   * to either a FindUserPasswordAllResultInterface or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_USER_PASSWORDS_PATTERN)
  findAllUserPasswords(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') userPasswordFilterDto: UserPasswordFilterDto,
  ): Promise<FindUserPasswordAllResultInterface | NotFoundException> {
    return this.userPasswordsService.findAll(userId, userPasswordFilterDto);
  }

  /**
   * Fetch user password.
   *
   * Version:1.0.0.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {FindOneByUserPasswordDto} findOneByUserPasswordDto -Data transfer object,
   * contains key-value.
   * @returns {Promise<UserPasswordEntity|NotFoundException>} -Promise that resolves to either a,
   * UserPasswordEntity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_USER_PASSWORDS_PATTERN)
  findOneByUserPassword(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') findOneByUserPasswordDto: FindOneByUserPasswordDto,
  ): Promise<UserPasswordEntity | NotFoundException> {
    return this.userPasswordsService.findOneBy(
      userId,
      findOneByUserPasswordDto,
    );
  }

  /**
   * Saves user login token.
   *
   * Version:1.0.0.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {CreatePasswordDto} createPasswordDto -Data transfer object contains,
   * user password details.
   * @returns {Promise<UserLoginTokenEntity>} -Promise that resolves to UserLoginTokenEntity.
   */
  @MessagePattern(MICROSERVICE_SAVE_USER_LOGIN_TOKEN_PATTERN)
  saveUserLoginToken(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createUserLoginTokenDto: CreateUserLoginTokenDto,
  ): Promise<UserLoginTokenEntity> {
    return this.userLoginTokensService.create(userId, createUserLoginTokenDto);
  }

  /**
   * Fetch user login tokens based on filters.
   *
   * Version:1.0.0.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {UserLoginTokenFiltersDto} userLoginTokenFiltersDto -Data transfer object contains,
   * user password details.
   * @returns {Promise<UserLoginTokenFindAllResultInterface|NotFoundException>} -Promise that resolves to,
   * either a UserLoginTokenFindAllResultInterface or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_USER_LOGIN_TOKENS_PATTERN)
  findAllUserLoginTokens(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') userLoginTokenFiltersDto: UserLoginTokenFiltersDto,
  ): Promise<UserLoginTokenFindAllResultInterface | NotFoundException> {
    return this.userLoginTokensService.findAll(
      userId,
      userLoginTokenFiltersDto,
    );
  }

  /**
   * Fetch one user login token by its ID.
   *
   * Version:1.0.0.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -ID of user login token.
   * @returns {Promise<UserLoginTokenEntity|NotFoundException>} -Promise that resolves to,
   * either a UserLoginTokenEntity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_USER_LOGIN_TOKEN_PATTERN)
  findOneUserLoginToken(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<UserLoginTokenEntity | NotFoundException> {
    return this.userLoginTokensService.findOne(userId, id);
  }

  /**
   * Updates user login token.
   *
   * Version:1.0.0.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {UpdateUserLoginTokenDto} updateUserLoginTokenDto -Data transfer object contains,
   * user login details to update.
   * @returns {Promise<UpdateResult|NotFoundException>} -Promise that resolves to,
   * either a NotFoundException or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_UPDATE_USER_LOGIN_TOKEN_PATTERN)
  updateUserLoginToken(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateUserLoginTokenDto: UpdateUserLoginTokenDto,
  ): Promise<UpdateResult | NotFoundException> {
    return this.userLoginTokensService.update(
      userId,
      updateUserLoginTokenDto.token_id,
      updateUserLoginTokenDto,
    );
  }

  /**
   * Removes user login token.
   *
   * Version:1.0.0.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -ID of user login token,
   * @returns {Promise<DeleteResult>} -Promise that resolves to DeleteResult.
   */
  @MessagePattern(MICROSERVICE_REMOVE_USER_LOGIN_TOKEN_PATTERN)
  removeUserLoginToken(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.userLoginTokensService.remove(userId, id);
  }
}
