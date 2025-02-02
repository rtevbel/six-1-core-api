import { Injectable } from '@nestjs/common';
import { DeleteResult, Like, Repository, UpdateResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserLoginTokenEntity } from './entities/user-login-token.entity';
import { CreateUserLoginTokenDto } from './dto/create-user-login-token.dto';
import { UpdateUserLoginTokenDto } from './dto/update-user-login-token.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/find-all-result.interface';
import {RpcException} from "@nestjs/microservices";
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../common/constants';

/**
 * UserLoginToken service class.
 *
 * @version 1.0.0
 *
 * This service class handles all user-login-token,
 * related operations by using UserLoginTokenRepository.
 */
@Injectable()
export class UserLoginTokensService {
  constructor(
    @InjectRepository(UserLoginTokenEntity)
    private readonly UserLoginTokenRepository: Repository<UserLoginTokenEntity>,
  ) {}

  /**
   * Saves login token.
   *
   * @version 1.0.0
   *
   * This service method save user login token details by using,
   * UserLoginTokenRepository class.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {CreateUserLoginTokenDto} createUserLoginTokenDto - Data transfer object contains,
   * user login token details.
   * @returns {Promise<UserLoginTokenEntity>} - Promise that resolves to UserLoginTokenEntity.
   */
  async create(
    userId: number,
    createUserLoginTokenDto: CreateUserLoginTokenDto,
  ): Promise<UserLoginTokenEntity> {
    return await this.UserLoginTokenRepository.save(
      this.UserLoginTokenRepository.create(createUserLoginTokenDto),
    );
  }

  /**
   * Fetches user login tokens.
   *
   * @version 1.0.0
   *
   * @param {number} userId -Authenticated user ID.
   * @param {FiltersDto} filtersDto -Data transfer object contains,
   * filter params.
   * @returns {Promise<FindAllResultInterface>} -Promise that resolves to a ,
   * FindAllResultInterface.
   * 
   * @throws {RpcException} - Throws RpcException if no records found.
   * 
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    let search = filtersDto.search ?? '';
    let limit = filtersDto.limit ?? 10;
    let page = filtersDto.page ?? 1;
    let sortBy = filtersDto.sortBy ?? 'token_id';
    let sortOrder = filtersDto.sortOrder ?? 'DESC';

    let findQuery = {};

    //If search param is set pass to query
    if (search) {
      findQuery = {
        ...findQuery,
        ...{
          where: [
            { token: Like('%' + search + '%') },
            { ip_address: Like('%' + search + '%') },
            { user_agent: Like('%' + search + '%') },
            { device_name: Like('%' + search + '%') },
            {
              user: [
                { firt_name: Like('%' + search + '%') },
                { last_name: Like('%' + search + '%') },
                { email: Like('%' + search + '%') },
              ],
            },
          ],
        },
      };
    }

    //Set limit and sortBy keys
    findQuery = {
      ...findQuery,
      ...{
        order: {
          [sortBy]: sortOrder,
        },
      },
      ...{
        take: limit,
        skip: (page - 1) * limit,
      },
    };

    const [tokens, total] =
      await this.UserLoginTokenRepository.findAndCount(findQuery);

    //Throw error if not record found against passed filter params.
    if (tokens.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
          '{entity_name}',
          UserLoginTokenEntity.name,
        ),
      );
    }

    return <FindAllResultInterface>{
      tokens: tokens,
      pagination: {
        total: total,
        page: page,
        limit: limit,
      },
    };
  }

  /**
   * Fetches user token.
   *
   * @version 1.0.0
   *
   * This service method uses UserLoginTokenRepository,
   * class to fetch user token by its ID.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -ID of user token.
   * @returns {Promise<UserLoginTokenEntity>} -Promise that resolves to a
   * UserLoginTokenEntity.
   * 
   * @throws {RpcException} - Throws RpcException if no records found.
   * 
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<UserLoginTokenEntity> {
    let token = await this.UserLoginTokenRepository.findOneByOrFail({
      token_id: id,
    });

    if (!token) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}',UserLoginTokenEntity.name),
      );
    }

    return token;
  }

  /**
   * Updates user token.
   *
   * @version 1.0.0
   *
   * This service method updates user token details by using,
   * UserLoginTokenRepository class.
   *
   * @param {number}  userId -Authenticated user ID.
   * @param {number} id -ID of user token.
   * @param {UpdateUserLoginTokenDto} updateUserLoginTokenDto -Data transfer object,
   * contains user token details.
   * @returns {Promise<UpdateResult>} -Promise that resolves to a,
   * UpdateResult.
   * 
   * @throws {RpcException} - Throws RpcException if no records found.
   * 
   */
  async update(
    userId: number,
    id: number,
    updateUserLoginTokenDto: UpdateUserLoginTokenDto,
  ): Promise<UpdateResult> {
    let user_token = await this.UserLoginTokenRepository.findOneByOrFail({
      token_id: id,
    });

    if (!user_token) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}',UserLoginTokenEntity.name),
      );
    }

    return await this.UserLoginTokenRepository.update(
      { token_id: id },
      updateUserLoginTokenDto,
    );
  }

  /**
   * Removes user token.
   *
   * @version 1.0.0
   *
   * This service method removes user token by using,
   * UserLoginTokenRepository.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -ID of user token.
   * @returns {Promise<DeleteResult>} -Promise that resolves to,
   * DeleteResult.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.UserLoginTokenRepository.delete({ token_id: id });
  }
}
