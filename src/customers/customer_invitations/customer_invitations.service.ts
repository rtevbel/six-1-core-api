import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DeleteResult, UpdateResult } from 'typeorm';
import { CustomerInvitationEntity } from './entities/customer_invitation.entity';
import { CreateCustomerInvitationDto } from './dto/create-customer_invitation.dto';
import { UpdateCustomerInvitationDto } from './dto/update-customer_invitation.dto';
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
export class CustomerInvitationsService {
  constructor(
    @InjectRepository(CustomerInvitationEntity)
    private readonly invitationRepository: Repository<CustomerInvitationEntity>,
  ) {}

  async create(
    userId: number,
    createDto: CreateCustomerInvitationDto,
  ): Promise<CustomerInvitationEntity> {
    createDto.invitedBy = userId;
    return await this.invitationRepository.save(
      this.invitationRepository.create(createDto),
    );
  }

  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);
    const [invitations, total] =
      await this.invitationRepository.findAndCount(findQuery);

    if (!invitations.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CustomerInvitationEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: invitations,
      invitations: invitations,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(userId: number, id: number): Promise<CustomerInvitationEntity> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationId: id },
    });

    if (!invitation) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerInvitationEntity.name,
        ),
      );
    }

    return invitation;
  }

  async update(
    userId: number,
    id: number,
    updateDto: UpdateCustomerInvitationDto,
  ): Promise<UpdateResult> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationId: id },
    });

    if (!invitation) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerInvitationEntity.name,
        ),
      );
    }

    return await this.invitationRepository.update(id, updateDto);
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationId: id },
    });

    if (!invitation) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerInvitationEntity.name,
        ),
      );
    }

    return await this.invitationRepository.delete({ invitationId: id });
  }

  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};
    const where: Record<string, any> = {};

    if (filtersDto.projectId) {
      where.projectId = filtersDto.projectId;
    }

    if (filtersDto.taskId) {
      where.taskId = filtersDto.taskId;
    }

    if (filtersDto.status) {
      where.status = filtersDto.status;
    }

    if (filtersDto.search) {
      query.where = [
        { ...where, email: Like(`%${filtersDto.search}%`) },
        { ...where, token: Like(`%${filtersDto.search}%`) },
      ];
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
