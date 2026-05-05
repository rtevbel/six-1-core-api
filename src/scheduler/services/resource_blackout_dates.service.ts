import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {  Repository,
  DeleteResult,
  UpdateResult,
  SelectQueryBuilder,
} from 'typeorm';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import { RpcException } from '@nestjs/microservices';
import { ResourceBlackoutDateEntity } from '../entities/resource_blackout_date.entity';
import { CreateResourceBlackoutDateDto } from '../dto/create-resource-blackout-date.dto';
import { UpdateResourceBlackoutDateDto } from '../dto/update-resource-blackout-date.dto';
import { FiltersResourceBlackoutDateDto } from '../dto/filters-resource-blackout-date.dto';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';
export interface FindAllResourceBlackoutResult {
  items: ResourceBlackoutDateEntity[];
  blackoutRecords: ResourceBlackoutDateEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: RuntimeV2ListPagination;
}

@Injectable()
export class ResourceBlackoutDatesService {
  constructor(
    @InjectRepository(ResourceBlackoutDateEntity)
    private readonly repo: Repository<ResourceBlackoutDateEntity>,
  ) {}

  async create(
    userId: number,
    dto: CreateResourceBlackoutDateDto,
  ): Promise<ResourceBlackoutDateEntity> {
    return await this.repo.save(this.repo.create(dto));
  }

  async findAll(
    userId: number,
    filtersDto: FiltersResourceBlackoutDateDto,
  ): Promise<FindAllResourceBlackoutResult> {
    const qb = this.buildQuery(filtersDto);
    const [items, total] = await qb.getManyAndCount();

    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ResourceBlackoutDateEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: items,
      blackoutRecords: items,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(
    userId: number,
    id: number,
  ): Promise<ResourceBlackoutDateEntity> {
    const record = await this.repo.findOne({
      where: { blackoutId: id },
      relations: ['resource'],
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ResourceBlackoutDateEntity.name,
        ),
      );
    }

    return record;
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateResourceBlackoutDateDto,
  ): Promise<UpdateResult> {
    const record = await this.repo.findOne({
      where: { blackoutId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ResourceBlackoutDateEntity.name,
        ),
      );
    }

    return await this.repo.update(id, dto);
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.repo.delete({ blackoutId: id });
  }

  private buildQuery(
    filtersDto: FiltersResourceBlackoutDateDto,
  ): SelectQueryBuilder<ResourceBlackoutDateEntity> {
    const qb = this.repo
      .createQueryBuilder('blackout')
      .leftJoinAndSelect('blackout.resource', 'resource');

    if (filtersDto.resourceId) {
      qb.andWhere('blackout.resourceId = :resourceId', {
        resourceId: filtersDto.resourceId,
      });
    }

    if (filtersDto.from) {
      qb.andWhere('blackout.startDate >= :from', { from: filtersDto.from });
    }

    if (filtersDto.to) {
      qb.andWhere('blackout.endDate <= :to', { to: filtersDto.to });
    }

    if (filtersDto.sortBy) {
      qb.orderBy(
        `blackout.${filtersDto.sortBy}`,
        (filtersDto.sortOrder || 'ASC') as 'ASC' | 'DESC',
      );
    }

    if (filtersDto.limit) {
      const limit = Math.min(filtersDto.limit, 25);
      const page = filtersDto.page || 1;
      qb.take(limit);
      qb.skip((page - 1) * limit);
      filtersDto.limit = limit;
      filtersDto.page = page;
    }

    return qb;
  }

  private buildPagination(
    filtersDto: any,
    total: number,
  ): RuntimeV2ListPagination {
    return buildRuntimeV2ListPagination(
      filtersDto.page,
      filtersDto.limit,
      total,
      10,
    );
  }
}
