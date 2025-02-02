import { Injectable } from '@nestjs/common';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserPasswordEntity } from './entities/user-password.entity';
import { CreatePasswordDto } from './dto/create-password.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/find-all-result.interface';
import { FindOneByDto } from './dto/find-one-by.dto';
import {RpcException} from "@nestjs/microservices";
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../common/constants';

/**
 * UserPasswordService class.
 * 
 *  @version 1.0.0
 * 
 * This service class handles all,
 * user-password related operations using,
 * userPasswordRepository.
 * 
 */
@Injectable()
export class UserPasswordsService {

  /**
   * Special method resolves dependencies.
   * 
   * @param {Repository<UserPasswordEntity>} userPasswordRepository 
   */
  constructor(
    @InjectRepository(UserPasswordEntity)
    private readonly userPasswordRepository: Repository<UserPasswordEntity>,
  ) {}

  /**
   * Save user password.
   *
   * @version 1.0.0.
   *
   * This service method saves user password by,
   * using userPasswordRepository class business logic.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {CreatePasswordDto} createPasswordDto -Data transfer object contains,
   * user password details.
   * @returns {Promise<UserPasswordEntity>} -Promise that resolves to UserPasswordEntity.
   */

  async create(
    userId: number,
    createPasswordDto: CreatePasswordDto,
  ): Promise<UserPasswordEntity> {
    return await this.userPasswordRepository.save(
      this.userPasswordRepository.create(createPasswordDto),
    );
  }

  /**
   * Fetch passwords.
   *
   * @version 1.0.0.
   *
   * This service method uses userPasswordRepository,
   * class's business logic to fetch passwords against filter params.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {FiltersDto} filtersDto -Data transfer object contains filter,
   * params.
   * @returns {Promise<FindAllResultInterface>} -Promise that resolves to a,
   * FindAllResultInterface.
   * 
   * @throws {RpcException} -Throws RpcException if no record found.
   * 
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    let search = filtersDto.search ?? '';
    let limit = filtersDto.limit ?? 10;
    let page = filtersDto.page ?? 1;
    let sortBy = filtersDto.sortBy ?? 'password_id';
    let sortOrder = filtersDto.sortOrder ?? 'DESC';

    let findQuery = {};

    if (search) {
      findQuery = {
        ...findQuery,
        ...{
          where: [
            { ip_address: Like('%' + search + '%') },
            {
              user: [
                { first_name: Like('%' + search + '%') },
                { last_name: Like('%' + search + '%') },
                { email: Like('%' + search + '%') },
                { username: Like('%' + search + '%') },
              ],
            },
          ],
        },
      };
    }

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

    const [passwords, total] =
      await this.userPasswordRepository.findAndCount(findQuery);

    if (passwords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
          '{entity_name}',
          UserPasswordEntity.name,
        ),
      );
    }

    return <FindAllResultInterface>{
      passwords: passwords,
      pagination: {
        total: total,
        page: page,
        limit: limit,
      },
    };
  }

  /**
   * Fetch password.
   *
   * @version 1.0.0.
   *
   * This service method uses userPasswordRepository,
   * class to fetch the user_password.
   *
   * @param {number} userId -Authenticated user ID
   * @param {number} id -ID of user_password
   * @returns {Promise<UserPasswordEntity>} -Promise that resolves to a,
   * UserPasswordEntity,
   *
   * @throws {RpcException} -Throws RpcException if no record found.
   * 
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<UserPasswordEntity> {
    let userPassword = await this.userPasswordRepository.findOneByOrFail({
      password_id: id,
    });

    if (!userPassword) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserPasswordEntity.name),
      );
    }

    return userPassword;
  }

  /**
   * Fetch password by.
   *
   * @version 1.0.0.
   *
   * This service method uses userPasswordRepository,
   * class to fetch user password.
   *
   * @param {number} userId -Authenticate user ID.
   * @param {FindOneByDto} findOneByDto -Data trasnfer object contains,
   * user password object's key-values.
   * @returns {Promise<UserPasswordEntity>} -Promise that resolves to a,
   * UserPasswordEntity.
   */
  async findOneBy(
    userId: number,
    findOneByDto: FindOneByDto,
  ): Promise<UserPasswordEntity> {
    let userPassword =
      await this.userPasswordRepository.findOneByOrFail(findOneByDto);

    if (!userPassword) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserPasswordEntity.name),
      );
    }

    return userPassword;
  }
}
