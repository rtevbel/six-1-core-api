import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, UpdateResult, Like } from 'typeorm';
import { CustomerContactInfoEntity } from './entities/customer_contact_info.entity';
import { CreateCustomerContactInfoDto } from './dto/create-customer_contact_info.dto';
import { UpdateCustomerContactInfoDto } from './dto/update-customer_contact_info.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';

@Injectable()
export class CustomerContactInfoService {
  constructor(
    @InjectRepository(CustomerContactInfoEntity)
    private readonly contactInfoRepository: Repository<CustomerContactInfoEntity>,
  ) {}

  async create(
    userId: number,
    customerId: number,
    createDto: CreateCustomerContactInfoDto,
  ): Promise<CustomerContactInfoEntity> {
    createDto.customerId = customerId;
    createDto.createdBy = userId;
    createDto.updatedBy = userId;

    return await this.contactInfoRepository.save(
      this.contactInfoRepository.create(createDto),
    );
  }

  async findAllByFilters(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);
    const [records, total] =
      await this.contactInfoRepository.findAndCount(findQuery);

    if (!records.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CustomerContactInfoEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: records,
      contactInfoRecords: records,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(
    userId: number,
    customerId: number,
    id: number,
  ): Promise<CustomerContactInfoEntity> {
    const record = await this.contactInfoRepository.findOne({
      where: { customerContactId: id, customerId },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerContactInfoEntity.name,
        ),
      );
    }

    return record;
  }

  async update(
    userId: number,
    customerId: number,
    id: number,
    updateDto: UpdateCustomerContactInfoDto,
  ): Promise<UpdateResult> {
    const record = await this.contactInfoRepository.findOne({
      where: { customerContactId: id, customerId },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerContactInfoEntity.name,
        ),
      );
    }

    updateDto.updatedBy = userId;

    return await this.contactInfoRepository.update(id, updateDto);
  }

  async remove(
    userId: number,
    customerId: number,
    id: number,
  ): Promise<DeleteResult> {
    const record = await this.contactInfoRepository.findOne({
      where: { customerContactId: id, customerId },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerContactInfoEntity.name,
        ),
      );
    }

    return await this.contactInfoRepository.delete({
      customerContactId: id,
      customerId,
    });
  }

  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      where: { customerId: filtersDto.customerId },
    };

    if (filtersDto.search) {
      query.where = [
        {
          customerId: filtersDto.customerId,
          secondaryEmail: Like(`%${filtersDto.search}%`),
        },
        {
          customerId: filtersDto.customerId,
          phone: Like(`%${filtersDto.search}%`),
        },
        {
          customerId: filtersDto.customerId,
          address: Like(`%${filtersDto.search}%`),
        },
      ];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
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
