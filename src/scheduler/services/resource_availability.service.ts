import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DeleteResult,
  UpdateResult,
  SelectQueryBuilder,
} from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ResourceAvailabilityEntity } from '../entities/resource_availability.entity';
import { CreateResourceAvailabilityDto } from '../dto/create-resource-availability.dto';
import { UpdateResourceAvailabilityDto } from '../dto/update-resource-availability.dto';
import { FiltersResourceAvailabilityDto } from '../dto/filters-resource-availability.dto';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';

export interface FindAllResourceAvailabilityResult {
  availabilityRecords: ResourceAvailabilityEntity[];
  pagination: { total: number; page: number; limit: number };
}

@Injectable()
export class ResourceAvailabilityService {
  constructor(
    @InjectRepository(ResourceAvailabilityEntity)
    private readonly repo: Repository<ResourceAvailabilityEntity>,
  ) {}

  async create(
    userId: number,
    dto: CreateResourceAvailabilityDto,
  ): Promise<ResourceAvailabilityEntity> {
    return await this.repo.save(this.repo.create(dto));
  }

  async findAll(
    userId: number,
    filtersDto: FiltersResourceAvailabilityDto,
  ): Promise<FindAllResourceAvailabilityResult> {
    const qb = this.buildQuery(filtersDto);
    const [items, total] = await qb.getManyAndCount();

    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ResourceAvailabilityEntity.name,
        ),
      );
    }

    return {
      availabilityRecords: items,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  async findOne(
    userId: number,
    id: number,
  ): Promise<ResourceAvailabilityEntity> {
    const record = await this.repo.findOne({
      where: { availabilityId: id },
      relations: ['resource'],
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ResourceAvailabilityEntity.name,
        ),
      );
    }

    return record;
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateResourceAvailabilityDto,
  ): Promise<UpdateResult> {
    const record = await this.repo.findOne({
      where: { availabilityId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ResourceAvailabilityEntity.name,
        ),
      );
    }

    return await this.repo.update(id, dto);
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.repo.delete({ availabilityId: id });
  }

  private buildQuery(
    filtersDto: FiltersResourceAvailabilityDto,
  ): SelectQueryBuilder<ResourceAvailabilityEntity> {
    const qb = this.repo
      .createQueryBuilder('availability')
      .leftJoinAndSelect('availability.resource', 'resource');

    if (filtersDto.resourceId) {
      qb.andWhere('availability.resourceId = :resourceId', {
        resourceId: filtersDto.resourceId,
      });
    }

    if (typeof filtersDto.isRecurring === 'boolean') {
      qb.andWhere('availability.isRecurring = :isRecurring', {
        isRecurring: filtersDto.isRecurring ? 1 : 0,
      });
    }

    if (filtersDto.from) {
      qb.andWhere('availability.startTime >= :from', {
        from: filtersDto.from,
      });
    }

    if (filtersDto.to) {
      qb.andWhere('availability.endTime <= :to', {
        to: filtersDto.to,
      });
    }

    if (filtersDto.sortBy) {
      qb.orderBy(
        `availability.${filtersDto.sortBy}`,
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
    filtersDto: FiltersResourceAvailabilityDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }
}
