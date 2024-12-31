import { Injectable, NotFoundException } from '@nestjs/common';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserPasswordEntity } from './entities/user-password.entity';
import { CreatePasswordDto } from './dto/create-password.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/find-all-result.interface';
import { FindOneByDto } from './dto/find-one-by.dto';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../common/constants';

@Injectable()
export class UserPasswordsService {
  constructor(
    @InjectRepository(UserPasswordEntity)
    private readonly userPasswordRepository: Repository<UserPasswordEntity>,
  ) {}

  /**
   * Save user password.
   *
   * Version:1.0.0.
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
   * Version:1.0.0.
   *
   * This service method uses userPasswordRepository,
   * class's business logic to fetch passwords against filter params.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {FiltersDto} filtersDto -Data transfer object contains filter,
   * params.
   * @returns {Promise<FindAllResultInterface|NotFoundException>} -Promise that resolves either to a FindAllResultInterface or a NotFoundException.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | NotFoundException> {
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
      throw new NotFoundException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
          '{entity_name}',
          'User passwords',
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
   * Version:1.0.0.
   *
   * This service method uses userPasswordRepository,
   * class to fetch the user_password.
   *
   * @param {number} userId -Authenticated user ID
   * @param {number} id -ID of user_password
   * @returns {Promise<UserPasswordEntity|NotFoundException>} -Promise that resolves either to a UserPasswordEntity,
   * or a NotFoundException.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<UserPasswordEntity | NotFoundException> {
    let userPassword = await this.userPasswordRepository.findOneByOrFail({
      password_id: id,
    });

    if (!userPassword) {
      throw new NotFoundException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', 'User password'),
      );
    }

    return userPassword;
  }

  /**
   * Fetch password by.
   *
   * Version:1.0.0.
   *
   * This service method uses userPasswordRepository,
   * class to fetch user password.
   *
   * @param {number} userId -Authenticate user ID.
   * @param {FindOneByDto} findOneByDto -Data trasnfer object contains,
   * user password object's key-values.
   * @returns {Promise<UserPasswordEntity|NotFoundException>} -Promise that resolves to either a,
   * UserPasswordEntity or a NotFoundException.
   */
  async findOneBy(
    userId: number,
    findOneByDto: FindOneByDto,
  ): Promise<UserPasswordEntity | NotFoundException> {
    let userPassword =
      await this.userPasswordRepository.findOneByOrFail(findOneByDto);

    if (!userPassword) {
      throw new NotFoundException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', 'User password'),
      );
    }

    return userPassword;
  }
}
