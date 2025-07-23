import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserRoleEntity } from './entities/tenant_user_role.entity';
import { CreateTenantUserRoleDto } from './dto/create-tenant_user_role.dto';
import { UpdateTenantUserRoleDto } from './dto/update-tenant_user_role.dto';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class TenantUserRoleService {
  constructor(
    @InjectRepository(TenantUserRoleEntity)
    private readonly tenantUserRoleRepository: Repository<TenantUserRoleEntity>,
  ) {}

  /**
   * Creates a new tenant user role record.
   * @param requestingUserId - ID of the user making the request.
   * @param createTenantUserRoleDto - DTO containing tenant user role details.
   * @returns The created TenantUserRoleEntity.
   */
  async create(
    requestingUserId: number,
    createTenantUserRoleDto: CreateTenantUserRoleDto,
  ): Promise<TenantUserRoleEntity> {
    createTenantUserRoleDto.createdBy = requestingUserId;

    return await this.tenantUserRoleRepository.save(
      this.tenantUserRoleRepository.create(createTenantUserRoleDto),
    );
  }

  /**
   * Retrieves all tenant user roles.
   * @param requestingUserId - ID of the user making the request.
   * @returns An array of TenantUserRoleEntity records.
   */
  async findAll(requestingUserId: number): Promise<TenantUserRoleEntity[]> {
    const userRoles = await this.tenantUserRoleRepository.find();

    if (userRoles.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserRoleEntity.name,
        ),
      );
    }

    return userRoles;
  }

  /**
   * Retrieves a specific tenant user role by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the tenant user role record.
   * @returns The TenantUserRoleEntity record.
   */
  async findOne(
    requestingUserId: number,
    id: number,
  ): Promise<TenantUserRoleEntity> {
    const userRole = await this.tenantUserRoleRepository.findOne({
      where: { tenantUserRoleId: id },
    });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUserRoleEntity.name,
        ),
      );
    }
    return userRole;
  }

  /**
   * Updates a specific tenant user role record.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the tenant user role record.
   * @param updateTenantUserRoleDto - DTO containing updated tenant user role details.
   * @returns The result of the update operation.
   */
  async update(
    requestingUserId: number,
    id: number,
    updateTenantUserRoleDto: UpdateTenantUserRoleDto,
  ): Promise<UpdateResult> {
    const userRole = await this.tenantUserRoleRepository.findOne({
      where: { tenantUserRoleId: id },
    });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUserRoleEntity.name,
        ),
      );
    }

    updateTenantUserRoleDto.updatedBy = requestingUserId;

    return await this.tenantUserRoleRepository.update(
      id,
      updateTenantUserRoleDto,
    );
  }

  /**
   * Deletes a specific tenant user role record.
   * @param requestingUserId - ID of the user making the request.
   * @param id - ID of the tenant user role record.
   * @returns The result of the delete operation.
   */
  async remove(
    requestingUserId: number,
    id: number,
  ): Promise<DeleteResult> {
    const userRole = await this.tenantUserRoleRepository.findOne({
      where: { tenantUserRoleId: id },
    });

    if (!userRole) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantUserRoleEntity.name,
        ),
      );
    }

    return await this.tenantUserRoleRepository.delete(id);
  }
}