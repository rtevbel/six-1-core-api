import {
  Controller,
  Inject,
  UsePipes,
  ParseIntPipe,
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
  RpcException
} from '@nestjs/microservices';
import { UserEntity } from './entities/user.entity';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import {
  V1_0_CREATE_USER_PATTERN,
  V1_0_FIND_ALL_USER_PATTERN,
  V1_0_FIND_ONE_USER_PATTERN,
  V1_0_FIND_ONE_USER_BY_PATTERN,
  V1_0_REMOVE_USER_PATTERN,
  V1_0_UPDATE_USER_PATTERN,
  V1_0_SAVE_USER_PASSWORD_PATTERN,
  V1_0_FIND_ALL_USER_PASSWORDS_PATTERN,
  V1_0_FIND_ONE_USER_PASSWORD_PATTERN,
  V1_0_FIND_ALL_USER_LOGIN_TOKENS_PATTERN,
  V1_0_FIND_ONE_USER_LOGIN_TOKEN_PATTERN,
  V1_0_REMOVE_USER_LOGIN_TOKEN_PATTERN,
  V1_0_UPDATE_USER_LOGIN_TOKEN_PATTERN,
  V1_0_SAVE_USER_LOGIN_TOKEN_PATTERN,
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
import { FindByDTO } from './dto/find-by.dto';
import  {MESSAGE_BROKER_USER_SERVICE_CLIENT_TOKEN} from "./constants";

/**
 * UsersController handles user-related operations in the microservice architecture.
 * This controller processes user-related requests via message patterns and communicates
 * with the `UsersService` for business logic.
 *
 * @category Controllers
 */
@Controller('users')
export class UsersController {
  /**
   * Initializes the UsersController.
   *
   * @version 1.0.0
   *
   * @param {UsersService} usersService - Service containing business logic for user-related operations.
   * @param {ClientProxy} client - ClientProxy instance for messaging communication.
   */
  constructor(
    private usersService: UsersService,
    private userPasswordsService: UserPasswordsService,
    private userLoginTokensService: UserLoginTokensService,
    @Inject(MESSAGE_BROKER_USER_SERVICE_CLIENT_TOKEN)
     private client: ClientProxy,
  ) {}

  /**
   * Handles the creation of a new user.
   *
   * @version 1.0.0
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {CreateUserDto} createUserDto - Data Transfer Object containing user creation data.
   * @param {RmqContext} context - RabbitMQ message context.
   * @returns {Promise<UserEntity>} -Promise that resolves to created user Entity.
   */
  @MessagePattern(V1_0_CREATE_USER_PATTERN)
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
   * @version 1.0.0
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {FiltersDto} filtersDto - Filters to apply for fetching users.
   * @returns {Promise<FindAllResultInterface>} -Promise that resolves to,
   * FindAllResultInterface.
   * 
   * @throws {RpcException} - Throws a RpcException if no records are found.
   * 
   */
  @MessagePattern(V1_0_FIND_ALL_USER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.usersService.findAll(userId, filtersDto);
  }

  /**
   * Fetches a single user by ID.
   *
   * @version 1.0.0
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {number} id - ID of the user to fetch.
   * @returns {Promise<UserEntity>} -Promise that resolves to a,
   * UserEntity.
   * 
   * @throws {RpcException} - Throws a RpcException if no record is found.
   * 
   */
  @MessagePattern(V1_0_FIND_ONE_USER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<UserEntity> {
    return this.usersService.findOne(userId, id);
  }

  /**
   * Fetches a single user by filter.
   *
   * @version 1.0.0
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {FindByDTO} findByDTO - Data transfer object contains filter params.
   * @returns { Promise<UserEntity>} -Promise that resolves to a,
   * UserEntity.
   * 
   * @throws {RpcException} - Throws a RpcException if no record is found.
   * 
   */
  @MessagePattern(V1_0_FIND_ONE_USER_BY_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findOneBy(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') findByDTO: FindByDTO,
  ): Promise<UserEntity | RpcException> {
    return this.usersService.findOneBy(userId, findByDTO);
  }

  /**
   * Updates an existing user.
   *
   * @version 1.0.0
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {UpdateUserDto} updateUserDto - Data Transfer Object containing user update data.
   * @returns {Promise<UpdateResult | RpcException>} -Promise that resolves to a,
   * UpdateResult.
   * 
   * @throws {RpcException} - Throws a RpcException if no record is found.
   * 
   */
  @MessagePattern(V1_0_UPDATE_USER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateUserDto: UpdateUserDto,
  ): Promise<UpdateResult> {
    return this.usersService.update(
      userId,
      updateUserDto.user_id,
      updateUserDto,
    );
  }

  /**
   * Deletes a user by ID.
   *
   * @version 1.0.0
   *
   * @param {number} userId - ID of the user performing the action.
   * @param {number} id - ID of the user to delete.
   * @returns {Promise<DeleteResult>} -Promise that resolves to DeleteResult.
   */
  @MessagePattern(V1_0_REMOVE_USER_PATTERN)
  remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.usersService.remove(userId, id);
  }

  /**
   * Saves user's password.
   *
   * @version 1.0.0
   *
   * @param {number} userId -Authenticated user ID.
   * @param {CreatePasswordDto} createPasswordDto -Data transfer object contains,
   * user password details.
   * @returns {Promise<UserPasswordEntity>} -Promise that resolves to UserPasswordEntity.
   */
  @MessagePattern(V1_0_SAVE_USER_PASSWORD_PATTERN)
  saveUserPassword(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createPasswordDto: CreatePasswordDto,
  ): Promise<UserPasswordEntity> {
    return this.userPasswordsService.create(userId, createPasswordDto);
  }

  /**
   * Fetches user's password by its ID.
   *
   * @version 1.0.0
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -ID of user password to fetch.
   * @returns {Promise<UserPasswordEntity>} -Promise that resolves to a,
   * UserPasswordEntity.
   * 
   * @throws {RpcException} - Throws a RpcException if no record is found.
   * 
   */
  @MessagePattern(V1_0_FIND_ONE_USER_PASSWORD_PATTERN)
  findOneUserPassword(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<UserPasswordEntity> {
    return this.userPasswordsService.findOne(userId, id);
  }

  /**
   * Fetches user passwords based on filters.
   *
   * @version 1.0.0
   *
   * @param {number} userId -Authenticated user ID.
   * @param {UserPasswordFilterDto} userPasswordFilterDto -Data transfer,
   * object contains filters data.
   * @returns {Promise<FindUserPasswordAllResultInterface>} -Promise that resolves,
   * to a FindUserPasswordAllResultInterface.
   * 
   * @throws {RpcException} - Throws a RpcException if no record is found.
   * 
   */
  @MessagePattern(V1_0_FIND_ALL_USER_PASSWORDS_PATTERN)
  findAllUserPasswords(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') userPasswordFilterDto: UserPasswordFilterDto,
  ): Promise<FindUserPasswordAllResultInterface | RpcException> {
    return this.userPasswordsService.findAll(userId, userPasswordFilterDto);
  }

  /**
   * Fetches user password.
   *
   * @version 1.0.0
   *
   * @param {number} userId -Authenticated user ID.
   * @param {FindOneByUserPasswordDto} findOneByUserPasswordDto -Data transfer object,
   * contains filter params.
   * @returns {Promise<UserPasswordEntity>} -Promise that resolves to a,
   * UserPasswordEntity.
   * 
   * @throws {RpcException} - Throws a RpcException if no record is found.
   * 
   */
  @MessagePattern(V1_0_FIND_ONE_USER_PASSWORD_PATTERN)
  findOneUserPasswordBy(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') findOneByUserPasswordDto: FindOneByUserPasswordDto,
  ): Promise<UserPasswordEntity | RpcException> {
    return this.userPasswordsService.findOneBy(
      userId,
      findOneByUserPasswordDto,
    );
  }

  /**
   * Saves user's login token.
   *
   * @version 1.0.0
   *
   * @param {number} userId -Authenticated user ID.
   * @param {CreateUserLoginTokenDto} createUserLoginTokenDto -Data transfer object contains,
   * user's password details.
   * @returns {Promise<UserLoginTokenEntity>} -Promise that resolves to UserLoginTokenEntity.
   */
  @MessagePattern(V1_0_SAVE_USER_LOGIN_TOKEN_PATTERN)
  saveUserLoginToken(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createUserLoginTokenDto: CreateUserLoginTokenDto,
  ): Promise<UserLoginTokenEntity> {
    return this.userLoginTokensService.create(userId, createUserLoginTokenDto);
  }

  /**
   * Fetches user's login tokens based on filters.
   *
   * @version 1.0.0
   *
   * @param {number} userId -Authenticated user ID.
   * @param {UserLoginTokenFiltersDto} userLoginTokenFiltersDto -Data transfer object contains,
   * user password details.
   * @returns {Promise<UserLoginTokenFindAllResultInterface|RpcException>} -Promise that resolves to,
   * a UserLoginTokenFindAllResultInterface.
   * 
   * @throws {RpcException} - Throws a RpcException if no record is found.
   * 
   */
  @MessagePattern(V1_0_FIND_ALL_USER_LOGIN_TOKENS_PATTERN)
  findAllUserLoginTokens(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') userLoginTokenFiltersDto: UserLoginTokenFiltersDto,
  ): Promise<UserLoginTokenFindAllResultInterface> {
    return this.userLoginTokensService.findAll(
      userId,
      userLoginTokenFiltersDto,
    );
  }

  /**
   * Fetches one user's login token by its ID.
   *
   * @version 1.0.0
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -ID of user login token.
   * @returns {Promise<UserLoginTokenEntity|RpcException>} -Promise that resolves to,
   * a UserLoginTokenEntity.
   * 
   * @throws {RpcException} - Throws a RpcException if no record is found.
   * 
   */
  @MessagePattern(V1_0_FIND_ONE_USER_LOGIN_TOKEN_PATTERN)
  findOneUserLoginToken(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<UserLoginTokenEntity> {
    return this.userLoginTokensService.findOne(userId, id);
  }

  /**
   * Updates user's login token.
   *
   * @version 1.0.0
   *
   * @param {number} userId -Authenticated user ID.
   * @param {UpdateUserLoginTokenDto} updateUserLoginTokenDto -Data transfer object contains,
   * user login details to update.
   * @returns {Promise<UpdateResult>} -Promise that resolves to,
   * a RpcException.
   * 
   * @throws {RpcException} - Throws a RpcException if no record is found.
   * 
   */
  @MessagePattern(V1_0_UPDATE_USER_LOGIN_TOKEN_PATTERN)
  updateUserLoginToken(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateUserLoginTokenDto: UpdateUserLoginTokenDto,
  ): Promise<UpdateResult> {
    return this.userLoginTokensService.update(
      userId,
      updateUserLoginTokenDto.token_id,
      updateUserLoginTokenDto,
    );
  }

  /**
   * Removes user's login token.
   *
   * @version 1.0.0
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -ID of user's login token,
   * @returns {Promise<DeleteResult>} -Promise that resolves to DeleteResult.
   */
  @MessagePattern(V1_0_REMOVE_USER_LOGIN_TOKEN_PATTERN)
  removeUserLoginToken(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.userLoginTokensService.remove(userId, id);
  }
}
