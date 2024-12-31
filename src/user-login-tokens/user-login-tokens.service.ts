import { Injectable, NotFoundException } from '@nestjs/common';
import { DeleteResult, Like, Repository, UpdateResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserLoginTokenEntity } from './entities/user-login-token.entity';
import { CreateUserLoginTokenDto } from './dto/create-user-login-token.dto';
import { UpdateUserLoginTokenDto } from './dto/update-user-login-token.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/find-all-result.interface';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../common/constants';

/**
 * User login token service class.
 *
 * Version:1.0.0.
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
   * Save login token.
   *
   * Version:1.0.0.
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
   * Fetch user login tokens.
   *
   * Version:1.0.0.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {FiltersDto} filtersDto -Data transfer object contains,
   * filter params.
   * @returns {Promise<FindAllResultInterface|NotFoundException>} -Promise that resolves to either a ,
   * FindAllResultInterface or a NotFoundException.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | NotFoundException> {
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
      throw new NotFoundException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
          '{entity_name}',
          'User tokens',
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
   * Fetch user token.
   *
   * Version:1.0.0.
   *
   * This service method uses UserLoginTokenRepository,
   * class to fetch user token by its ID.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -ID of user token.
   * @returns {Promise<UserLoginTokenEntity|NotFoundException>} -Promise that resolves to either a
   * UserLoginTokenEntity or a  NotFoundException.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<UserLoginTokenEntity | NotFoundException> {
    let token = await this.UserLoginTokenRepository.findOneByOrFail({
      token_id: id,
    });

    if (!token) {
      throw new NotFoundException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', 'User token'),
      );
    }

    return token;
  }

  /**
   * Update user token.
   *
   * Version:1.0.0.
   *
   * This service method updates user token details by using,
   * UserLoginTokenRepository class.
   *
   * @param {number}  userId -Authenticated user ID.
   * @param {number} id -ID of user token.
   * @param {UpdateUserLoginTokenDto} updateUserLoginTokenDto -Data transfer object,
   * contains user token details.
   * @returns {Promise<UpdateResult|NotFoundException>} -Promise that resolves to either a UpdateResult,
   * or a NotFoundException.
   */
  async update(
    userId: number,
    id: number,
    updateUserLoginTokenDto: UpdateUserLoginTokenDto,
  ): Promise<UpdateResult | NotFoundException> {
    let user_token = await this.UserLoginTokenRepository.findOneByOrFail({
      token_id: id,
    });

    if (!user_token) {
      throw new NotFoundException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', 'user token'),
      );
    }

    return await this.UserLoginTokenRepository.update(
      { token_id: id },
      updateUserLoginTokenDto,
    );
  }

  /**
   * Remove user token.
   *
   * Version:1.0.0.
   *
   * This service method removes user token by using,
   * UserLoginTokenRepository class .
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
