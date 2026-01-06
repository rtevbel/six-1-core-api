import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { SharingInvitationEntity } from '../entities/sharing_invitation.entity';
import { CreateSharingInvitationDto } from '../dto/sharing-invitations/create-sharing-invitation.dto';
import { UpdateSharingInvitationDto } from '../dto/sharing-invitations/update-sharing-invitation.dto';
import { FiltersSharingInvitationDto } from '../dto/sharing-invitations/filters-sharing-invitation.dto';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';

export interface FindAllSharingInvitationsResult {
  invitations: SharingInvitationEntity[];
  pagination: { total: number; page: number; limit: number };
}

@Injectable()
export class SharingInvitationsService {
  constructor(
    @InjectRepository(SharingInvitationEntity)
    private readonly repo: Repository<SharingInvitationEntity>,
  ) {}

  /**
   * Creates a new sharing invitation record.
   * @param userId - ID of the user creating the record.
   * @param dto - DTO containing invitation details.
   * @returns The created sharing invitation entity.
   */
  async create(
    userId: number,
    dto: CreateSharingInvitationDto,
  ): Promise<SharingInvitationEntity> {
    return await this.repo.save(this.repo.create(dto));
  }

  /**
   * Retrieves sharing invitations with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filters - Filters for querying sharing invitations.
   * @returns An object containing the list of invitations and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filters: FiltersSharingInvitationDto,
  ): Promise<FindAllSharingInvitationsResult> {
    const qb = this.buildQuery(filters);
    const [items, total] = await qb.getManyAndCount();

    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          SharingInvitationEntity.name,
        ),
      );
    }

    return {
      invitations: items,
      pagination: this.buildPagination(filters, total),
    };
  }

  /**
   * Retrieves a single sharing invitation by ID.
   * @param userId - ID of the user requesting the data.
   * @param invitationId - ID of the invitation to retrieve.
   * @returns The sharing invitation entity.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    invitationId: number,
  ): Promise<SharingInvitationEntity> {
    const record = await this.repo.findOne({
      where: { invitationId },
      relations: ['sharedByTenant', 'sharedWithTenant'],
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SharingInvitationEntity.name,
        ),
      );
    }

    return record;
  }

  /**
   * Updates an existing sharing invitation record.
   * @param userId - ID of the user updating the record.
   * @param invitationId - ID of the invitation to update.
   * @param dto - DTO containing updated fields.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    invitationId: number,
    dto: UpdateSharingInvitationDto,
  ): Promise<UpdateResult> {
    const record = await this.repo.findOne({ where: { invitationId } });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SharingInvitationEntity.name,
        ),
      );
    }

    return await this.repo.update(invitationId, dto);
  }

  /**
   * Deletes a sharing invitation record by ID.
   * @param userId - ID of the user deleting the record.
   * @param invitationId - ID of the invitation to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, invitationId: number): Promise<DeleteResult> {
    return await this.repo.delete({ invitationId });
  }

  private buildQuery(
    filters: FiltersSharingInvitationDto,
  ): SelectQueryBuilder<SharingInvitationEntity> {
    const qb = this.repo
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.sharedByTenant', 'sharedByTenant')
      .leftJoinAndSelect('invitation.sharedWithTenant', 'sharedWithTenant');

    if (filters.sharedEntityType) {
      qb.andWhere('invitation.sharedEntityType = :sharedEntityType', {
        sharedEntityType: filters.sharedEntityType,
      });
    }

    if (filters.sharedEntityId) {
      qb.andWhere('invitation.sharedEntityId = :sharedEntityId', {
        sharedEntityId: filters.sharedEntityId,
      });
    }

    if (filters.sharedByTenantId) {
      qb.andWhere('invitation.sharedByTenantId = :sharedByTenantId', {
        sharedByTenantId: filters.sharedByTenantId,
      });
    }

    if (filters.sharedWithTenantId) {
      qb.andWhere('invitation.sharedWithTenantId = :sharedWithTenantId', {
        sharedWithTenantId: filters.sharedWithTenantId,
      });
    }

    if (filters.status) {
      qb.andWhere('invitation.status = :status', { status: filters.status });
    }

    if (filters.sortBy) {
      qb.orderBy(
        `invitation.${filters.sortBy}`,
        (filters.sortOrder || 'ASC') as 'ASC' | 'DESC',
      );
    }

    if (filters.limit) {
      const limit = Math.min(filters.limit, 25);
      const page = filters.page || 1;
      qb.take(limit);
      qb.skip((page - 1) * limit);
      filters.limit = limit;
      filters.page = page;
    }

    return qb;
  }

  private buildPagination(
    filters: FiltersSharingInvitationDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
  }
}
