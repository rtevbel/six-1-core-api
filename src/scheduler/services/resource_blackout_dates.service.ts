import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DeleteResult,
  UpdateResult,
  SelectQueryBuilder,
} from 'typeorm';
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
  blackoutRecords: ResourceBlackoutDateEntity[];
  pagination: { total: number; page: number; limit: number };
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

    return {
      blackoutRecords: items,
      pagination: this.buildPagination(filtersDto, total),
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
    filtersDto: FiltersResourceBlackoutDateDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }
}
