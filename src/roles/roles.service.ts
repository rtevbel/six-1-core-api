import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DeleteResult, Like, Repository, UpdateResult , FindOptionsWhere} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from '../roles/entities/role.entity';
import { RoleDescriptionEntity } from '../roles/entities/role-description.entity';
import { RolePermissionEntity } from '../roles/entities/role-permission.entity';
import { FiltersDto } from './dto/filters.dto';
import { findAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../common/constants';

/**
 * Roles service class.
 *
 * @version 1.0.0
 *
 * This service class uses roleRepository,
 * class to handle the role's all operations.
 */
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
   * Create Role.
   *
   * @version 1.0.0
   *
   * This service method uses roleRepository,
   * and CreateRoleDto to create role with its,
   * descriptions and permissions.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {CreateRoleDto} createRoleDto - Data transfer object contains,
   * role details.
   * @returns {Promise<RoleEntity>} - Promise that resolves to Role object.
   * 
   */
  async create(userId: number, createRoleDto: CreateRoleDto): Promise<RoleEntity> {
    const { descriptions } = createRoleDto;

    createRoleDto = { ...createRoleDto, ...{ created_by: userId } };

    // If role's descriptions attribute is set iterate and update them with additional information.
    if (descriptions.length > 0) {
      createRoleDto.descriptions = descriptions.map((description) => {

        let roleDescription = new RoleDescriptionEntity();
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
  
   /**
   * Fetches all roles.
   *
   * @version 1.0.0
   *
   * This service method uses roleRepository,
   * and FiltersDto to fetch roles with their
   * descriptions and permissions.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {FiltersDto} filtersDto - Data transfer object contains,
   * roles filter params.
   * @returns {Promise<findAllResultInterface>} - Promise that resolves to Roles object.
   * 
   * @throws {RpcException} -Throws RpcException exception if no records found.
   * 
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<findAllResultInterface> {


    let findQuery = {};
    // If filter's search param is set construct like subquery.

    if (filtersDto.search) {

      let whereCondition:FindOptionsWhere<RoleEntity>[];
       whereCondition = [
        {
          descriptions: [
            { name: Like('%' + filtersDto.search + '%') },
            { description: Like('%' + filtersDto.search + '%') },
          ],
        }
      ];
      
      findQuery = {
        ...findQuery,
        where:whereCondition,
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
    
    //If no roles' record found against filter params throw  RpcException.
    if (roles.length === 0) {
        throw new RpcException(
           NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
            '{entity_name}',
             RoleEntity.name,
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
   * Fetches Role.
   *
   * @version 1.0.0
   *
   * This service method uses roleRepository,
   * class to fetch role entity by its ID.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {number} id - ID of role being fetched.
   * @returns {Promise<RoleEntity>} -Promise that resolves into
   * RoleEntity.
   * 
   * @throws {RpcException} -Throws RpcException exception if no record found.
   * 
   */
  async findOne(userId: number, id: number): Promise<RoleEntity> {
    let role = await this.roleRepository.findOneByOrFail({
      role_id: id,
    });

    if (!role) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', RoleEntity.name),
      );
    }
    return role;
  }

  /**
   * Updates role.
   *
   * @version 1.0.0
   *
   * This service method uses roleRepository class,
   *  and UpdateRoleDto to update role's details.
   *
   * @param {number} userId -Authenticated user ID.
   * @param {number} id - Role ID being updated.
   * @param {UpdateRoleDto} updateRoleDto - Data transfer object contains,
   * role details.
   * @returns {Promise<UpdateResult>} -Promise that resolves to UpdateResult.
   * 
   * @throws {RpcException} -Throws RpcException exception if no record found.
   * 
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
      throw new RpcException(
         NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', RoleEntity.name),
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

        let roleDescription = new RoleDescriptionEntity();

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
        let rolePermission = new RolePermissionEntity();

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
   * Removes role by its ID.
   *
   * @version 1.0.0
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
