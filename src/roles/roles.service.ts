import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { RoleDescriptionEntity } from './entities/role-description.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(RoleDescriptionEntity)
    private readonly roleDescriptionRepository: Repository<RoleDescriptionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
  ) {}

  /**
   * Creates a new role record.
   * @param userId - ID of the user creating the record.
   * @param createRoleDto - Data Transfer Object containing role details.
   * @returns The created RoleEntity.
   */
  async create(
    userId: number,
    createRoleDto: CreateRoleDto,
  ): Promise<RoleEntity> {
    return await this.roleRepository.save(
      this.roleRepository.create(createRoleDto),
    );
  }

  /**
   * Retrieves all roles with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of roles and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    // Fetch roles and count total records
    const [roles, total] = await this.roleRepository.findAndCount(findQuery);

    // Throw exception if no records are found
    if (roles.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          RoleEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);

    return {
      items: roles,
      roles,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
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
      query.where = [{ name: Like(`%${filtersDto.search}%`) }];
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
  ): { total: number; page: number; limit: number; totalPages: number } {
    const limit = filtersDto.limit || 10;
    return {
      total,
      page: filtersDto.page || 1,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Retrieves a single role by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the role to retrieve.
   * @returns The RoleEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<RoleEntity> {
    const role = await this.roleRepository.findOneByOrFail({
      roleId: id,
    });

    if (!role) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', RoleEntity.name),
      );
    }

    return role;
  }

  /**
   * Updates an existing role record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the role to update.
   * @param updateRoleDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateRoleDto: UpdateRoleDto,
  ): Promise<UpdateResult> {
    const role = await this.roleRepository.findOneByOrFail({
      roleId: id,
    });

    if (!role) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', RoleEntity.name),
      );
    }

    const { descriptions, permissions, ...roleUpdateData } = updateRoleDto;

    // Handle descriptions update
    if (descriptions) {
      for (const description of descriptions) {
        if (description.roleDescriptionId) {
          // Update existing description
          await this.roleDescriptionRepository.update(
            description.roleDescriptionId,
            description,
          );
        } else {
          // Create new description
          description.roleId = id; // Ensure the roleId is set for new descriptions
          await this.roleDescriptionRepository.save(
            this.roleDescriptionRepository.create(description),
          );
        }
      }
    }

    // Handle permissions update
    if (permissions) {
      for (const permission of permissions) {
        if (permission.rolePermissionId) {
          // Update existing permission
          await this.rolePermissionRepository.update(
            permission.rolePermissionId,
            permission,
          );
        } else {
          // Create new permission
          permission.roleId = id; // Ensure the roleId is set for new permissions
          await this.rolePermissionRepository.save(
            this.rolePermissionRepository.create(permission),
          );
        }
      }
    }

    return await this.roleRepository.update(id, roleUpdateData);
  }

  /**
   * Deletes a role record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the role to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.roleRepository.delete({ roleId: id });
  }
}
