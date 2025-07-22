import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantWorkingHoursEntity } from './entities/tenant_working_hour.entity';
import { CreateTenantWorkingHoursDto } from './dto/create-tenant_working_hour.dto';
import { UpdateTenantWorkingHoursDto } from './dto/update-tenant_working_hour.dto';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantWorkingHoursService {
  constructor(
    @InjectRepository(TenantWorkingHoursEntity)
    private readonly tenantWorkingHoursRepository: Repository<TenantWorkingHoursEntity>,
  ) {}

  /**
   * Create a new tenant working hours record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the working hours.
   * @param createTenantWorkingHoursDto - DTO containing working hours data.
   * @returns The created TenantWorkingHoursEntity.
   */
  async create(
    requestingUserId: number,
    tenantId: number,
    createTenantWorkingHoursDto: CreateTenantWorkingHoursDto,
  ): Promise<TenantWorkingHoursEntity> {
    createTenantWorkingHoursDto.createdBy = requestingUserId;
    createTenantWorkingHoursDto.tenantId = tenantId;

    return await this.tenantWorkingHoursRepository.save(
      this.tenantWorkingHoursRepository.create(createTenantWorkingHoursDto),
    );
  }

  /**
   * Find all working hours for a specific tenant.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the working hours.
   * @returns Array of TenantWorkingHoursEntity.
   */
  async findAllByTenant(
    requestingUserId: number,
    tenantId: number,
  ): Promise<TenantWorkingHoursEntity[]> {
    const workingHours = await this.tenantWorkingHoursRepository.find({
      where: { tenantId },
    });

    if (workingHours.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantWorkingHoursEntity.name,
        ),
      );
    }

    return workingHours;
  }

  /**
   * Find a specific working hours record by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the working hours.
   * @param id - ID of the working hours record.
   * @returns The TenantWorkingHoursEntity.
   */
  async findOne(
    requestingUserId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantWorkingHoursEntity> {
    const workingHours = await this.tenantWorkingHoursRepository.findOne({
      where: { tenantWorkingHourId: id, tenantId },
    });

    if (!workingHours) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantWorkingHoursEntity.name,
        ),
      );
    }

    return workingHours;
  }

  /**
   * Update a specific working hours record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the working hours.
   * @param id - ID of the working hours record.
   * @param updateTenantWorkingHoursDto - DTO containing updated working hours data.
   * @returns UpdateResult indicating the outcome of the update operation.
   */
  async update(
    requestingUserId: number,
    tenantId: number,
    id: number,
    updateTenantWorkingHoursDto: UpdateTenantWorkingHoursDto,
  ): Promise<UpdateResult> {
    const workingHours = await this.tenantWorkingHoursRepository.findOne({
      where: { tenantWorkingHourId: id, tenantId },
    });

    if (!workingHours) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantWorkingHoursEntity.name,
        ),
      );
    }

    updateTenantWorkingHoursDto.updatedBy = requestingUserId;

    return await this.tenantWorkingHoursRepository.update(
      id,
      updateTenantWorkingHoursDto,
    );
  }

  /**
   * Remove a specific working hours record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the working hours.
   * @param id - ID of the working hours record.
   * @returns DeleteResult indicating the outcome of the delete operation.
   */
  async remove(
    requestingUserId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const workingHours = await this.tenantWorkingHoursRepository.findOne({
      where: { tenantWorkingHourId: id, tenantId },
    });

    if (!workingHours) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantWorkingHoursEntity.name,
        ),
      );
    }

    return await this.tenantWorkingHoursRepository.delete({
      tenantWorkingHourId: id,
      tenantId,
    });
  }
}
