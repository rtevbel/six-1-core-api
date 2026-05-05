import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { CustomerProjectMemberEntity } from './entities/customer_project_member.entity';
import { CreateCustomerProjectMemberDto } from './dto/create-customer_project_member.dto';
import { UpdateCustomerProjectMemberDto } from './dto/update-customer_project_member.dto';
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
export class CustomerProjectMembersService {
  constructor(
    @InjectRepository(CustomerProjectMemberEntity)
    private readonly projectMembersRepository: Repository<CustomerProjectMemberEntity>,
  ) {}

  async create(
    userId: number,
    createDto: CreateCustomerProjectMemberDto,
  ): Promise<CustomerProjectMemberEntity> {
    return await this.projectMembersRepository.save(
      this.projectMembersRepository.create(createDto),
    );
  }

  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);
    const [projectMembers, total] =
      await this.projectMembersRepository.findAndCount(findQuery);

    if (!projectMembers.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CustomerProjectMemberEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: projectMembers,
      projectMembers: projectMembers,
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
  ): Promise<CustomerProjectMemberEntity> {
    const record = await this.projectMembersRepository.findOne({
      where: { customerProjectMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerProjectMemberEntity.name,
        ),
      );
    }

    return record;
  }

  async update(
    userId: number,
    id: number,
    updateDto: UpdateCustomerProjectMemberDto,
  ): Promise<UpdateResult> {
    const record = await this.projectMembersRepository.findOne({
      where: { customerProjectMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerProjectMemberEntity.name,
        ),
      );
    }

    return await this.projectMembersRepository.update(id, updateDto);
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    const record = await this.projectMembersRepository.findOne({
      where: { customerProjectMemberId: id },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerProjectMemberEntity.name,
        ),
      );
    }

    return await this.projectMembersRepository.delete({
      customerProjectMemberId: id,
    });
  }

  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};
    const where: Record<string, any> = {};

    if (filtersDto.projectId) {
      where.projectId = filtersDto.projectId;
    }

    if (filtersDto.customerId) {
      where.customerId = filtersDto.customerId;
    }

    if (filtersDto.search) {
      const numericSearch = Number(filtersDto.search);
      if (!Number.isNaN(numericSearch)) {
        query.where = [
          { ...where, projectId: numericSearch },
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
