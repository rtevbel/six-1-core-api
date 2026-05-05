import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { CustomerTaskMemberEntity } from './entities/customer_task_member.entity';
import { CreateCustomerTaskMemberDto } from './dto/create-customer_task_member.dto';
import { UpdateCustomerTaskMemberDto } from './dto/update-customer_task_member.dto';
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
export class CustomerTaskMembersService {
  constructor(
    @InjectRepository(CustomerTaskMemberEntity)
    private readonly taskMembersRepository: Repository<CustomerTaskMemberEntity>,
  ) {}

  async create(
    userId: number,
    createDto: CreateCustomerTaskMemberDto,
  ): Promise<CustomerTaskMemberEntity> {
    return await this.taskMembersRepository.save(
      this.taskMembersRepository.create(createDto),
    );
  }

  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);
    const [taskMembers, total] =
      await this.taskMembersRepository.findAndCount(findQuery);

    if (!taskMembers.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CustomerTaskMemberEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: taskMembers,
      taskMembers: taskMembers,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(userId: number, id: number): Promise<CustomerTaskMemberEntity> {
    const record = await this.taskMembersRepository.findOne({
      where: { customerTaskMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerTaskMemberEntity.name,
        ),
      );
    }

    return record;
  }

  async update(
    userId: number,
    id: number,
    updateDto: UpdateCustomerTaskMemberDto,
  ): Promise<UpdateResult> {
    const record = await this.taskMembersRepository.findOne({
      where: { customerTaskMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerTaskMemberEntity.name,
        ),
      );
    }

    return await this.taskMembersRepository.update(id, updateDto);
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    const record = await this.taskMembersRepository.findOne({
      where: { customerTaskMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerTaskMemberEntity.name,
        ),
      );
    }

    return await this.taskMembersRepository.delete({
      customerTaskMemberId: id,
    });
  }

  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};
    const where: Record<string, any> = {};

    if (filtersDto.taskId) {
      where.taskId = filtersDto.taskId;
    }

    if (filtersDto.customerId) {
      where.customerId = filtersDto.customerId;
    }

    if (filtersDto.search) {
      const numericSearch = Number(filtersDto.search);
      if (!Number.isNaN(numericSearch)) {
        query.where = [
          { ...where, taskId: numericSearch },
          { ...where, customerId: numericSearch },
          { ...where, roleId: numericSearch },
        ];
      }
    } else if (Object.keys(where).length) {
      query.where = where;
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
