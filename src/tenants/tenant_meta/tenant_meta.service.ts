import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantMetaEntity } from './entities/tenant_meta.entity';
import { CreateTenantMetaDto } from './dto/create-tenant_meta.dto';
import { UpdateTenantMetaDto } from './dto/update-tenant_meta.dto';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantMetaService {
  constructor(
    @InjectRepository(TenantMetaEntity)
    private readonly tenantMetaRepository: Repository<TenantMetaEntity>,
  ) {}

  /**
   * Creates a new tenant metadata record.
   * @param userId - ID of the user making the request.
   * @param createTenantMetaDto - Data Transfer Object containing metadata details.
   * @returns The created TenantMetaEntity.
   */
  async create(
    userId: number,
    createTenantMetaDto: CreateTenantMetaDto,
  ): Promise<TenantMetaEntity> {
    
    console.log(createTenantMetaDto,'createTenantMetaDto');

    const newMeta = this.tenantMetaRepository.create(createTenantMetaDto);
    return this.tenantMetaRepository.save(newMeta);
  }

  /**
   * Retrieves all tenant metadata records for a specific tenant.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns List of TenantMetaEntity records.
   * @throws RpcException if no records are found.
   */
  async findAllByTenantId(
    userId: number,
    tenantId: number,
  ): Promise<TenantMetaEntity[]> {
    const tenantMeta = await this.tenantMetaRepository.find({
      where: { tenantId },
    });

    if (tenantMeta.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    return tenantMeta;
  }

  /**
   * Retrieves a single tenant metadata record by ID.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record.
   * @returns The TenantMetaEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    tenantMetaId: number,
  ): Promise<TenantMetaEntity> {
    const tenantMeta = await this.tenantMetaRepository.findOneByOrFail({
      tenantMetaId,
    });

    if (!tenantMeta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    return tenantMeta;
  }

  /**
   * Updates an existing tenant metadata record.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record to update.
   * @param updateTenantMetaDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    tenantMetaId: number,
    updateTenantMetaDto: UpdateTenantMetaDto,
  ): Promise<UpdateResult> {
    const tenantMeta = await this.tenantMetaRepository.findOneByOrFail({
      tenantMetaId,
    });

    if (!tenantMeta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }
    return this.tenantMetaRepository.update(tenantMetaId, updateTenantMetaDto);
  }

  /**
   * Deletes a tenant metadata record by ID.
   * @param userId - ID of the user making the request.
   * @param tenantMetaId - ID of the tenant metadata record to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantMetaId: number,
  ): Promise<DeleteResult> {
    const tenantMeta = await this.tenantMetaRepository.findOneByOrFail({
      tenantMetaId,
    });

    if (!tenantMeta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    return this.tenantMetaRepository.delete({ tenantMetaId });
  }

  /**
   * Finds the meta value for a specific tenant and meta key.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant associated with the metadata.
   * @param metaKey - The meta key to search for.
   * @returns The meta value as a string.
   * @throws RpcException if no record is found.
   */
  async findMetaValueByTenantIdAndMetaKey(
    userId: number,
    tenantId: number,
    metaKey: string,
  ): Promise<string> {
    const meta = await this.tenantMetaRepository.findOne({
      where: { tenantId, metaKey: metaKey },
    });

    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantMetaEntity.name,
        ),
      );
    }

    return meta.metaValue;
  }
}
