import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantTeamMemberEntity } from './entities/tenant_team_member.entity';
import { CreateTenantTeamMemberDto } from './dto/create-tenant_team_member.dto';
import { UpdateTenantTeamMemberDto } from './dto/update-tenant_team_member.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class TenantTeamMemberService {
  constructor(
    @InjectRepository(TenantTeamMemberEntity)
    private readonly tenantTeamMemberRepository: Repository<TenantTeamMemberEntity>,
  ) {}

  /**
   * Creates a new tenant team member record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param createTenantTeamMemberDto - DTO containing team member details.
   * @returns The created TenantTeamMemberEntity.
   */
  async create(
    requestingUserId: number,
    tenantTeamId: number,
    createTenantTeamMemberDto: CreateTenantTeamMemberDto,
  ): Promise<TenantTeamMemberEntity> {
    createTenantTeamMemberDto.tenantTeamId = tenantTeamId;

    return await this.tenantTeamMemberRepository.save(
      this.tenantTeamMemberRepository.create(createTenantTeamMemberDto),
    );
  }

  /**
   * Retrieves all team member records for a specific tenant team.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @returns An array of TenantTeamMemberEntity records.
   */
  async findAllByTenantTeamId(
    requestingUserId: number,
    tenantTeamId: number,
  ): Promise<TenantTeamMemberEntity[]> {
    const memberRecords = await this.tenantTeamMemberRepository.find({
      where: { tenantTeamId },
    });

    if (memberRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantTeamMemberEntity.name,
        ),
      );
    }

    return memberRecords;
  }

  /**
   * Retrieves team member records based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for searching and sorting records.
   * @returns An object containing the filtered records and pagination details.
   */
  async findAllByFilter(
    requestingUserId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [memberRecords, total] =
      await this.tenantTeamMemberRepository.findAndCount(findQuery);

    if (memberRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantTeamMemberEntity.name,
        ),
      );
    }

    return {
      tenantTeamMemberRecords: memberRecords,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a specific team member record by ID and tenant team ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param id - ID of the team member record.
   * @returns The TenantTeamMemberEntity record.
   */
  async findOne(
    requestingUserId: number,
    tenantTeamId: number,
    id: number,
  ): Promise<TenantTeamMemberEntity> {
    const member = await this.tenantTeamMemberRepository.findOne({
      where: { tenantTeamMemberId: id, tenantTeamId },
    });

    if (!member) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTeamMemberEntity.name,
        ),
      );
    }
    return member;
  }

  /**
   * Updates a specific team member record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param id - ID of the team member record.
   * @param updateTenantTeamMemberDto - DTO containing updated team member details.
   * @returns The result of the update operation.
   */
  async update(
    requestingUserId: number,
    tenantTeamId: number,
    id: number,
    updateTenantTeamMemberDto: UpdateTenantTeamMemberDto,
  ): Promise<UpdateResult> {
    const member = await this.tenantTeamMemberRepository.findOne({
      where: { tenantTeamMemberId: id, tenantTeamId },
    });

    if (!member) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTeamMemberEntity.name,
        ),
      );
    }

    return await this.tenantTeamMemberRepository.update(id, updateTenantTeamMemberDto);
  }

  /**
   * Deletes a specific team member record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param id - ID of the team member record.
   * @returns The result of the delete operation.
   */
  async remove(
    requestingUserId: number,
    tenantTeamId: number,
    id: number,
  ): Promise<DeleteResult> {
    const member = await this.tenantTeamMemberRepository.findOne({
      where: { tenantTeamMemberId: id, tenantTeamId },
    });

    if (!member) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTeamMemberEntity.name,
        ),
      );
    }

    return await this.tenantTeamMemberRepository.delete({
      tenantTeamMemberId: id,
      tenantTeamId,
    });
  }

  /**
   * Builds a query object for filtering and pagination.
   * @param filtersDto - DTO containing filter and pagination options.
   * @returns The query object.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { roleId: Like(`%${filtersDto.search}%`) },
        { user: { first_name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's first_name field
        { user: { last_name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's last_name field
        { user: { email: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's email field
      ];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  /**
   * Builds pagination metadata.
   * @param filtersDto - DTO containing pagination options.
   * @param total - Total number of records.
   * @returns Pagination metadata.
   */
  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }
}