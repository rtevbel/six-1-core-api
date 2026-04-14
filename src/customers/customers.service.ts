import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { CustomerEntity } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../common/constants';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}

  async create(
    userId: number,
    createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerEntity> {
    return await this.customerRepository.save(
      this.customerRepository.create(createCustomerDto),
    );
  }

  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);
    const [customers, total] =
      await this.customerRepository.findAndCount(findQuery);

    if (!customers.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CustomerEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);

    return {
      items: customers,
      customers,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(userId: number, id: number): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: { customerId: id },
    });

    if (!customer) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerEntity.name,
        ),
      );
    }

    return customer;
  }

  async update(
    userId: number,
    id: number,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<UpdateResult> {
    const customer = await this.customerRepository.findOne({
      where: { customerId: id },
    });

    if (!customer) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerEntity.name,
        ),
      );
    }

    return await this.customerRepository.update(id, updateCustomerDto);
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    const customer = await this.customerRepository.findOne({
      where: { customerId: id },
    });

    if (!customer) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerEntity.name,
        ),
      );
    }

    return await this.customerRepository.delete({ customerId: id });
  }

  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { email: Like(`%${filtersDto.search}%`) },
        { firstName: Like(`%${filtersDto.search}%`) },
        { lastName: Like(`%${filtersDto.search}%`) },
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
    filtersDto: FiltersDto,
    total: number,
  ): { total: number; page: number; limit: number; totalPages: number } {
    const limit = filtersDto.limit || 10;
    return {
      total,
      page: filtersDto.page || 1,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
