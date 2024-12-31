import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DeleteResult, Like, Repository, UpdateResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity';
import { RoleDescription } from '../roles/entities/role-description.entity';
import { RolePermission } from '../roles/entities/role-permission.entity';
import { FiltersDto } from './dto/filters.dto';
import { findAllResultInterface } from './interfaces/findall-result.interface';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../common/constants';

/**
 * Roles service class.
 *
 * Version:1.0.0.
 *
 * This service class uses roleRepository,
 * class to handle the role's all operations.
 */
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RoleDescription)
    private readonly roleDescriptionRepository: Repository<RoleDescription>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  /**
   * Create Role.
   *
   * Version:1.0.0.
   *
   * This service method uses roleRepository,
   * and CreateRoleDto to create role with its,
   * descriptions and permissions.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {CreateRoleDto} createRoleDto - Data transfer object contains,
   * role details.
   * @returns {Promise<Role>} - Promise that resolves to Role object.
   */
  async create(userId: number, createRoleDto: CreateRoleDto): Promise<Role> {
    const { descriptions } = createRoleDto;

    createRoleDto = { ...createRoleDto, ...{ created_by: userId } };

    // If role's descriptions attribute is set iterate and update them with additional information.
    if (descriptions.length > 0) {
      createRoleDto.descriptions = descriptions.map((description) => {
        let roleDescription = new RoleDescription();

        roleDescription.name = description.name;
        roleDescription.language_id = description.language_id;
        roleDescription.description = description.description ?? '';
        roleDescription.created_by = userId;

        return roleDescription;
      });
    }

    return await this.roleRepository.save(
      this.roleRepository.create(createRoleDto),
    );
  }

  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<findAllResultInterface | NotFoundException> {
    let findQuery = {};

    // If filter's search param is set construct like subquery.
    if (filtersDto.search) {
      findQuery = {
        ...findQuery,
        ...{
          WHERE: [
            {
              description: [
                { name: Like('%' + filtersDto.search + '%') },
                { description: Like('%' + filtersDto.search + '%') },
              ],
            },
          ],
        },
      };
    }

    // If filters sortBy param is set add order by clause in query.
    if (filtersDto.sortBy) {
      findQuery = {
        ...findQuery,
        ...{
          order: {
            descriptions: {
              [filtersDto.sortBy]: filtersDto.sortOrder,
            },
          },
        },
      };
    }

    // If filters limit param is set add pagination params in query.
    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page ? filtersDto.page : 1;
      filtersDto.limit = filtersDto.limit
        ? filtersDto.limit > 10
          ? 10
          : filtersDto.limit
        : 10;

      findQuery = {
        ...findQuery,
        ...{
          take: filtersDto.limit,
          skip: (filtersDto.page - 1) * filtersDto.limit,
        },
      };
    }

    const [roles, total] = await this.roleRepository.findAndCount(findQuery);

    //If no roles' record found against filter params throw  NotFoundException.
    if (roles.length === 0) {
      throw new NotFoundException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
          '{entity_name}',
          'Role',
        ),
      );
    }

    return {
      roles: roles,
      pagination: {
        total: total,
        page: filtersDto.page ? filtersDto.page : 1,
        limit: filtersDto.limit ? filtersDto.limit : 10,
      },
    };
  }

  /**
   * Fetch Role.
   *
   * Version:1.0.0.
   *
   * This service method uses roleRepository,
   * class to fetch role entity by its ID.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {number} id - ID of role being fetched.
   * @returns {Promise<Role|NotFoundException>} -Promise that resolves into
   * either Role or throws NotFoundException.
   */
  async findOne(userId: number, id: number): Promise<Role | NotFoundException> {
    let role = await this.roleRepository.findOneByOrFail({
      role_id: id,
    });

    if (!role) {
      throw new NotFoundException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', 'Role'),
      );
    }
    return role;
  }

  /**
   * Update role.
   *
   * Version: 1.0.0.
   *
   * This service method uses roleRepository class,
   * to update role details.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id - Role ID being updated.
   * @param {UpdateRoleDto} updateRoleDto - Data transfer object contains,
   * role details.
   * @returns {Promise<UpdateResult>} -Promise that resolves to UpdateResult.
   */
  async update(
    userId: number,
    id: number,
    updateRoleDto: UpdateRoleDto,
  ): Promise<UpdateResult> {
    let role = await this.roleRepository.findOneByOrFail({
      role_id: id,
    });

    if (!role) {
      throw new NotFoundException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', 'Role'),
      );
    }

    const { descriptions } = updateRoleDto;
    const { permissions } = updateRoleDto;
    const descriptionsListBeingUpdate: number[] = [];
    const permissionsListBeingUpdate: number[] = [];

    role.is_active = updateRoleDto.is_active ?? false;
    role.is_deleted = updateRoleDto.is_deleted ?? false;

    //If descriptions are set iterate and update them with additional information.
    if (descriptions.length > 0) {
      updateRoleDto.descriptions = descriptions.map((description) => {
        let updated_by = 0;
        let created_by = 0;

        let roleDescription = new RoleDescription();

        //Make a list of descriptions which are being updated.
        if (description.role_description_id) {
          descriptionsListBeingUpdate.push(description.role_description_id);
          updated_by = userId;
        }

        roleDescription.name = description.name ?? '';
        roleDescription.description = description.description ?? '';
        roleDescription.language_id = description.language_id ?? 1;
        roleDescription.updated_by = updated_by;
        roleDescription.created_by = created_by;

        return roleDescription;
      });
    }

    //If permissions are set iterate and update them with additional information.
    if (permissions && permissions.length > 0) {
      updateRoleDto.permissions = permissions.map((permission) => {
        let rolePermission = new RolePermission();

        //Make a list of permissions being updated.
        if (permission.role_permission_id) {
          permissionsListBeingUpdate.push(permission.role_permission_id);
        }
        rolePermission.permission_id = permission.permission_id ?? 0;
        rolePermission.role_id = permission.role_id ?? 0;
        rolePermission.role_permission_id = permission.role_permission_id ?? 0;

        return rolePermission;
      });
    }

    // Remove descriptions which are missing in update role descriptions list
    if (
      role.descriptions.length > 0 &&
      descriptionsListBeingUpdate.length > 0
    ) {
      role.descriptions.forEach((description) => {
        if (
          !descriptionsListBeingUpdate.includes(description.role_description_id)
        ) {
          this.roleDescriptionRepository.delete({
            role_description_id: description.role_description_id,
          });
        }
      });
    }

    // Remove permissions which are missing in update role permissions list
    if (role.permissions.length > 0 && permissionsListBeingUpdate.length > 0) {
      role.permissions.forEach((permission) => {
        if (
          !permissionsListBeingUpdate.includes(permission.role_permission_id)
        ) {
          this.rolePermissionRepository.delete({
            role_permission_id: permission.role_permission_id,
          });
        }
      });
    }

    //Update role with updated informations.
    let isUpdated = await this.roleRepository.save(role);

    return <UpdateResult>{
      raw: [],
      affected: isUpdated ? 1 : 0,
    };
  }

  /**
   * Remove role.
   *
   * Version:1.0.0.
   *
   * This service method uses roleRepository to,
   * delete role entity from database.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id - Role ID being deleted.
   * @returns {Promise<DeleteResult>} -Promise that resolves to DeleteResult.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.roleRepository.delete({ role_id: id });
  }
}
