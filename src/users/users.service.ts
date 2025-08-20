import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {FindByDTO} from "./dto/find-by.dto"
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Creates a new user record.
   * @param userId - ID of the user creating the record.
   * @param createUserDto - Data Transfer Object containing user details.
   * @returns The created UserEntity.
   */
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    return await this.userRepository.save(
      this.userRepository.create(createUserDto),
    );
  }

  /**
   * Retrieves all users with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of users and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    // Fetch users and count total records
    const [users, total] = await this.userRepository.findAndCount(findQuery);

    // Throw exception if no records are found
    if (users.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          UserEntity.name,
        ),
      );
    }

    return {
      users,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    // Apply search filters if provided
    if (filtersDto.search) {
      query.where = [
        { email: Like(`%${filtersDto.search}%`) },
        { username: Like(`%${filtersDto.search}%`) },
        { first_name: Like(`%${filtersDto.search}%`) },
        { last_name: Like(`%${filtersDto.search}%`) },
        { activation_key: Like(`%${filtersDto.search}%`) }
      ];
    }

    // Apply sorting if provided
    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    // Apply pagination if limit is provided
    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  /**
   * Builds the pagination object for the response.
   * @param filtersDto - Filters containing pagination details.
   * @param total - Total number of records matching the query.
   * @returns The pagination object.
   */
  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }

  /**
   * Retrieves a single user by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the user to retrieve.
   * @returns The UserEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<UserEntity> {

    const user = await this.userRepository.findOneByOrFail({
      userId: id,
    });

    if (!user) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserEntity.name),
      );
    }

    return user;
  }

  /**
   * Fetch user by filter.
   *
   * @version 1.0.0
   *
   * This service method fetch user,
   * from database by filter.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {FindByDTO} findByDTO -Data transfer object containing filter params.
   * @returns {Promise<UserEntity>} -Promise that resolves to UserEntity.
   *
   * @throws {RpcException} - Throws RpcException if no record found.
   *
   */
  async findOneBy(userId: number, findByDTO: FindByDTO): Promise<UserEntity> {
    let user = await this.userRepository.findOneBy(findByDTO);

    if (!user) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserEntity.name),
      );
    }

    return user;
  }



  /**
   * Updates an existing user record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the user to update.
   * @param updateUserDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UpdateResult> {
    const user = await this.userRepository.findOneByOrFail({
      userId: id,
    });

    if (!user) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserEntity.name),
      );
    }

    return await this.userRepository.update(id, updateUserDto);
  }

  /**
   * Deletes a user record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the user to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.userRepository.delete({ userId: id });
  }
}
