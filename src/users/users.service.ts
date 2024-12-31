import { Injectable, NotFoundException } from '@nestjs/common';
import { DeleteResult, Like, Repository, UpdateResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/find-all-result.interface';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../common/constants';

/**
 * User service class.
 *
 * Version:1.0.0.
 *
 * This user service class uses userRepository,
 * and userRoleRepository classes to manage user's,
 * CRUD operations.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private userRoleRepository: Repository<UserRoleEntity>,
  ) {}

  /**
   * Create user.
   *
   * Version:1.0.0.
   *
   * This service method creates new user,
   * in database by using userRepository class.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {CreateUserDto} createUserDto - Data tranfer object contains,
   * user details.
   * @returns {Promise<UserEntity>} - Promise that resolves to UserEntity.
   */
  async create(
    userId: number,
    createUserDto: CreateUserDto,
  ): Promise<UserEntity> {
    createUserDto = {
      ...createUserDto,
      ...{ created_by: userId },
    };
    return await this.userRepository.save(
      this.userRepository.create(createUserDto),
    );
  }

  /**
   * Fetch users.
   *
   * Version:1.0.0.
   *
   * This service method uses  userRepository,
   * class to fetch users from database against,
   * filter params.
   *
   * @param {number} userId -Auhenticated user ID.
   * @param {FiltersDto} filtersDto - Data trasnfer object contains,
   * filter params.
   * @returns {Promise<FindAllResultInterface|NotFoundException>} - Promise that resolves either into,
   *  FindAllResultInterface or NotFoundException.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | NotFoundException> {
    let search = filtersDto.search ?? '';
    let page = filtersDto.page ?? 1;
    let limit = filtersDto.limit ?? 10;
    let sortBy = filtersDto.sortBy ?? 'user_id';
    let sortOrder = filtersDto.sortOrder ?? 'DESC';

    let findQuery = {};

    //If search param is set add it to query
    if (search) {
      findQuery = {
        ...findQuery,
        ...{
          WHERE: [
            { first_name: Like('%' + search + '%') },
            { last_name: Like('%' + search + '%') },
            { email: Like('%' + search + '%') },
            { username: Like('%' + search + '%') },
          ],
        },
      };
    }

    //Update query with sortBy param
    findQuery = {
      ...findQuery,
      ...{
        order: {
          [sortBy]: sortOrder,
        },
      },
    };

    //Update query with limit param
    findQuery = {
      ...findQuery,
      ...{
        take: limit,
        skip: (page - 1) * limit,
      },
    };

    const [users, total] = await this.userRepository.findAndCount(findQuery);

    //Throws error if no record found
    if (users.length === 0) {
      throw new NotFoundException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
          '{entity_name}',
          'Users',
        ),
      );
    }

    return <FindAllResultInterface>{
      users: users,
      pagination: {
        total: total,
        page: page,
        limit: limit,
      },
    };
  }

  /**
   * Fetch user.
   *
   * Version:1.0.0.
   *
   * This service method fetch user,
   * from database by user ID.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id -ID of user being fetched.
   * @returns {Promise<UserEntity|NotFoundException>} -Promise that resolves either into UserEntity,
   * or NotFoundException.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<UserEntity | NotFoundException> {
    let user = await this.userRepository.findOneByOrFail({ user_id: id });

    if (!user) {
      throw new NotFoundException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', 'user'),
      );
    }

    return user;
  }

  /**
   * Update user.
   *
   * Version:1.0.0.
   *
   * This service method updates user's,
   * details by using userRepository.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id - ID of user being updated.
   * @param {updateUserDto} updateUserDto -Data transfer object contains,
   * user details.
   * @returns
   */
  async update(
    userId: number,
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UpdateResult> {
    let user = await this.userRepository.findOneByOrFail({ user_id: id });

    if (!user) {
      throw new NotFoundException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', 'user'),
      );
    }

    const { user_roles } = updateUserDto;

    user.first_name = updateUserDto.first_name ?? '';
    user.last_name = updateUserDto.last_name ?? '';
    if (updateUserDto.password) {
      user.password = updateUserDto.password;
    }
    user.interface_locale = updateUserDto.interface_locale ?? '';
    user.is_active = updateUserDto.is_active ?? false;
    user.is_deleted = updateUserDto.is_deleted ?? false;
    user.block_date = updateUserDto.block_date ?? '';
    user.extra = updateUserDto.extra ?? '';
    user.updated_by = userId;

    let userRolesBeingUpdated: number[] = [];
    let userRoles: UserRoleEntity[] = [];

    if (user_roles && user_roles.length > 0) {
      userRoles = user_roles.map((role) => {
        let userRoleEntity = new UserRoleEntity();
        if (role.user_role_id) {
          userRolesBeingUpdated.push(role.user_role_id);
        }
        userRoleEntity.role_id = role.role_id ?? 0;
        userRoleEntity.user_id = role.user_id ?? 0;
        userRoleEntity.user_role_id = role.user_role_id ?? 0;
        return userRoleEntity;
      });
    }

    if (userRolesBeingUpdated.length > 0 && user.user_roles) {
      user.user_roles.map((role) => {
        if (userRolesBeingUpdated.includes(role.user_role_id)) {
          this.userRoleRepository.delete({ user_role_id: role.user_role_id });
        }
      });
    }

    user.user_roles = userRoles; //Update user roles

    //delete user.user_passwords;
    //delete user.user_tokens;

    let isUpdated = await this.userRepository.save(user);
    return <UpdateResult>{
      raw: [],
      affected: isUpdated ? 1 : 0,
    };
  }

  /**
   * Remove user.
   *
   * Version:1.0.0.
   *
   * This service method removes user entity,
   * from database by using userRepository class,
   * and its ID.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id - ID of user being deleted.
   * @returns {Promise<DeleteResult>} -Promise that resolves into DeleteResult.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.userRepository.delete({ user_id: id });
  }
}
