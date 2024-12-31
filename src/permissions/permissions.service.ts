import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Like, Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { PermissionDescription } from './entities/permission-description.entity';
import { FiltersDto } from './dto/filters.dto';
import { findAllResultInterface } from './interfaces/findall-result.interface';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

/**
 * Permissions service class,
 *
 * Version: 1.0.0
 *
 * User's permissions service class uses Permission,
 * and PermissionDescription repositories to handle,
 * all crud operations.
 */
@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(PermissionDescription)
    private readonly permissionDescriptionRepository: Repository<PermissionDescription>,
  ) {}

  /**
   * Create permission.
   *
   * Version: 1.0.0.
   *
   * This service class's create permission,
   * method uses permission repository to handle,
   * permission creation.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {CreatePermissionDto} createPermissionDto - Data tranfer object contains permission details.
   * @returns {Promise<Permission>} - Promise that resolves to Permission object.
   */
  async create(
    userId: number,
    createPermissionDto: CreatePermissionDto,
  ): Promise<Permission> {
    createPermissionDto = {
      ...createPermissionDto,
      ...{ created_by: userId },
    };

    const { descriptions } = createPermissionDto;

    if (descriptions.length > 0) {
      createPermissionDto.descriptions = descriptions.map((description) => {
        return { ...description, ...{ created_by: userId } };
      });
    }

    return await this.permissionRepository.save(
      this.permissionRepository.create(createPermissionDto),
    );
  }

  /**
   * Fetch All permissions.
   *
   * Version:1.0.0.
   *
   * This service class's find all method uses permission,
   * repository to fetch permission records from database,
   * by using the client passed filter params.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {FiltersDto} filtersDto -Data transfer object contains filter params.
   * @returns {Promise<findAllResultInterface | NotFoundException >} - Promise that resolves,
   * either into  findAllResultInterface or NotFoundException.
   *
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<findAllResultInterface | NotFoundException> {
    let findAllQuery = {};

    if (filtersDto.search) {
      findAllQuery = {
        ...findAllQuery,
        ...{
          WHERE: [
            {
              descriptions: [
                { name: Like('%' + filtersDto.search + '%') },
                { description: Like('%' + filtersDto.search + '%') },
              ],
            },
          ],
        },
      };
    }

    if (filtersDto.sortBy) {
      if (filtersDto.sortBy === 'permission_id') {
        findAllQuery = {
          ...findAllQuery,
          ...{
            order: {
              descriptions: {
                [filtersDto.sortBy]: filtersDto.sortOrder,
              },
            },
          },
        };
      } else {
        findAllQuery = {
          ...findAllQuery,
          ...{
            order: {
              descriptions: {
                [filtersDto.sortBy]: filtersDto.sortOrder,
              },
            },
          },
        };
      }
    }

    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page ? filtersDto.page : 1;
      filtersDto.limit = filtersDto.limit
        ? filtersDto.limit > 10
          ? 10
          : filtersDto.limit
        : 10;
      findAllQuery = {
        ...findAllQuery,
        ...{
          take: filtersDto.limit,
          skip: (filtersDto.page - 1) * filtersDto.limit,
        },
      };
    }

    const [permissions, total] =
      await this.permissionRepository.findAndCount(findAllQuery);

    if (permissions.length === 0) {
      throw new NotFoundException();
    }

    return {
      permissions: permissions,
      pagination: {
        total: total,
        page: filtersDto.page ? filtersDto.page : 1,
        limit: filtersDto.limit ? filtersDto.limit : 10,
      },
    };
  }

  /**
   * Fetch one permission.
   *
   * Version:1.0.0.
   *
   * This service class' method uses permission,
   * reporitory class to find permission object by,
   * passed ID.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {number} id - The ID of permission being fetched.
   * @returns {Promise<Permission | NotFoundException >} - Promise that resolves either,
   * into Permission object or throws NotFoundException.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<Permission | NotFoundException> {
    let permission = await this.permissionRepository.findOneByOrFail({
      permission_id: id,
    });

    if (!permission) {
      throw new NotFoundException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          'permission',
        ),
      );
    }

    return permission;
  }

  /**
   * Update permission.
   *
   * Version: 1.0.0.
   *
   * This service class's method uses permission,
   * and permissionDescription repositories to ,
   * update permission and its description.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {number} id - Permission ID being updated.
   * @param {UpdatePermissionDto} updatePermissionDto - Data transfer object contains,
   * permission's details to update.
   * @returns {Promise<UpdateResult | NotFoundException>} - Promise that resolves either,
   * into UpdateResult or throws NotFoundException.
   */
  async update(
    userId: number,
    id: number,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<UpdateResult | NotFoundException> {
    let permission = await this.permissionRepository.findOneByOrFail({
      permission_id: id,
    });

    if (!permission) {
      throw new NotFoundException(
        NO_RECORD_FOUND_MESSAGE.replace('{entity_name}', 'permission'),
      );
    }

    const { descriptions } = updatePermissionDto;
    const permissionDescriptions = permission.descriptions;

    let permissionsListBeingUpdated: Number[] = [];

    if (descriptions.length > 0) {
      permission.descriptions = descriptions.map((description) => {
        let permissionDescription = new PermissionDescription();

        let updated_by = 0;
        let created_by = 0;

        if (description.permission_description_id) {
          updated_by = userId;
          permissionsListBeingUpdated.push(
            description.permission_description_id,
          );
        } else {
          created_by = userId;
        }

        if (description.name) {
          permissionDescription.name = description.name;
        }
        permissionDescription.description = description.description ?? '';
        permissionDescription.language_id = description.language_id ?? 1;
        permissionDescription.permission_id = description.permission_id ?? 0;
        permissionDescription.permission_description_id =
          description.permission_description_id ?? 0;
        permissionDescription.created_by = created_by;
        permissionDescription.updated_by = updated_by;

        return permissionDescription;
      });

      if (permissionsListBeingUpdated.length > 0) {
        permissionDescriptions.forEach((description) => {
          if (
            !permissionsListBeingUpdated.includes(
              description.permission_description_id,
            )
          ) {
            this.permissionDescriptionRepository.delete({
              permission_description_id: description.permission_description_id,
            });
          }
        });
      }
    }
    const isUpdated = await this.permissionRepository.save(permission);
    return <UpdateResult>{
      raw: [],
      affected: isUpdated ? 1 : 0,
    };
  }

  /**
   * Remove permission.
   *
   * Version:1.0.0.
   *
   * This service class's method uses permission,
   * repository to delete permission entity by,
   * using passed permission ID.
   *
   * @param {number} userId - Authenticated user ID.
   * @param {number} id - Permission ID being deleted.
   * @returns {Promise<DeleteResult>} - Promise that resolves to DeleteResult.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.permissionRepository.delete({ permission_id: id });
  }
}
