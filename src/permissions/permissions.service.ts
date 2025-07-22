import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permission.entity';
import { PermissionDescriptionEntity } from './entities/permission_description.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(PermissionDescriptionEntity)
    private readonly permissionDescriptionRepository: Repository<PermissionDescriptionEntity>,
  ) {}

  /**
   * Creates a new permission record.
   * @param userId - ID of the user creating the record.
   * @param createPermissionDto - Data Transfer Object containing permission details.
   * @returns The created PermissionEntity.
   */
  async create(
    userId: number,
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionEntity> {
    return await this.permissionRepository.save(
      this.permissionRepository.create(createPermissionDto),
    );
  }

  /**
   * Retrieves all permissions with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of permissions and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [permissions, total] =
      await this.permissionRepository.findAndCount(findQuery);

    if (permissions.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          PermissionEntity.name,
        ),
      );
    }

    return {
      permissions,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { descriptions: { name: Like(`%${filtersDto.search}%`) } },
      ];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

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
   * Retrieves a single permission by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the permission to retrieve.
   * @returns The PermissionEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<PermissionEntity> {
    const permission = await this.permissionRepository.findOneByOrFail({
      permission_id: id,
    });

    if (!permission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          PermissionEntity.name,
        ),
      );
    }

    return permission;
  }

  /**
   * Updates an existing permission record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the permission to update.
   * @param updatePermissionDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<UpdateResult> {
    const permission = await this.permissionRepository.findOneByOrFail({
      permission_id: id,
    });

    updatePermissionDto.updated_by = userId; // Set the updated_by field to the current user

    if (!permission) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          PermissionEntity.name,
        ),
      );
    }

    const { descriptions, ...updatePermissionDtoCopy } = updatePermissionDto;

    // Handle descriptions update
    if (descriptions) {
      for (const description of descriptions) {
        if (description.permission_description_id) {
          // Update existing description
          await this.permissionDescriptionRepository.update(
            description.permission_description_id,
            description,
          );
        } else {
          // Create new description
          description.permission_id = id; // Ensure the permission_id is set for new descriptions
          await this.permissionDescriptionRepository.save(
            this.permissionDescriptionRepository.create(description),
          );
        }
      }
    }

    return await this.permissionRepository.update(id, updatePermissionDtoCopy);
  }

  /**
   * Deletes a permission record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the permission to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.permissionRepository.delete({ permission_id: id });
  }
}
