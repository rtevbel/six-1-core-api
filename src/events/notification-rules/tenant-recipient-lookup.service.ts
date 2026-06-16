import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { TenantUserRoleEntity } from '../../tenants/tenant_users/tenant_user_roles/entities/tenant_user_role.entity';
import { RoleDescriptionEntity } from '../../roles/entities/role-description.entity';
import { PermissionDescriptionEntity } from '../../permissions/entities/permission_description.entity';

/** Role names treated as tenant administrators (seeded `Admin` role). */
export const TENANT_ADMIN_ROLE_NAMES = ['Admin', 'Administrator'] as const;

@Injectable()
export class TenantRecipientLookupService {
  private readonly logger = new Logger(TenantRecipientLookupService.name);

  constructor(
    @InjectRepository(TenantUsersEntity)
    private readonly tenantUserRepository: Repository<TenantUsersEntity>,
    @InjectRepository(TenantUserRoleEntity)
    private readonly tenantUserRoleRepository: Repository<TenantUserRoleEntity>,
    @InjectRepository(RoleDescriptionEntity)
    private readonly roleDescriptionRepository: Repository<RoleDescriptionEntity>,
    @InjectRepository(PermissionDescriptionEntity)
    private readonly permissionDescriptionRepository: Repository<PermissionDescriptionEntity>,
  ) {}

  /**
   * Keeps only user IDs that belong to the given tenant.
   */
  async filterUserIdsToTenant(
    tenantId: number,
    userIds: number[],
  ): Promise<number[]> {
    if (userIds.length === 0) {
      return [];
    }

    const rows = await this.tenantUserRepository
      .createQueryBuilder('tu')
      .select('tu.user_id', 'userId')
      .where('tu.tenant_id = :tenantId', { tenantId })
      .andWhere('tu.user_id IN (:...userIds)', { userIds })
      .getRawMany<{ userId: string }>();

    return [
      ...new Set(
        rows
          .map((row) => Number(row.userId))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
  }

  async findUserIdsByRoleName(
    tenantId: number,
    roleName: string,
  ): Promise<number[]> {
    const rows = await this.tenantUserRepository
      .createQueryBuilder('tu')
      .select('DISTINCT tu.user_id', 'userId')
      .innerJoin(
        TenantUserRoleEntity,
        'tur',
        'tur.tenant_user_id = tu.tenant_user_id',
      )
      .innerJoin(
        RoleDescriptionEntity,
        'rd',
        'rd.role_id = tur.role_id AND rd.language_id = 1',
      )
      .where('tu.tenant_id = :tenantId', { tenantId })
      .andWhere('rd.name = :roleName', { roleName })
      .getRawMany<{ userId: string }>();

    return this.toUserIdSet(rows);
  }

  async findUserIdsByPermission(
    tenantId: number,
    permission: string,
  ): Promise<number[]> {
    const rows = await this.tenantUserRepository
      .createQueryBuilder('tu')
      .select('DISTINCT tu.user_id', 'userId')
      .innerJoin(
        TenantUserRoleEntity,
        'tur',
        'tur.tenant_user_id = tu.tenant_user_id',
      )
      .innerJoin(
        'role_permissions',
        'rp',
        'rp.role_id = tur.role_id',
      )
      .innerJoin(
        PermissionDescriptionEntity,
        'pd',
        'pd.permission_id = rp.permission_id',
      )
      .where('tu.tenant_id = :tenantId', { tenantId })
      .andWhere('pd.name IN (:...names)', {
        names: this.permissionMatchNames(permission),
      })
      .getRawMany<{ userId: string }>();

    return this.toUserIdSet(rows);
  }

  async findTenantAdminUserIds(tenantId: number): Promise<number[]> {
    const rows = await this.tenantUserRepository
      .createQueryBuilder('tu')
      .select('DISTINCT tu.user_id', 'userId')
      .innerJoin(
        TenantUserRoleEntity,
        'tur',
        'tur.tenant_user_id = tu.tenant_user_id',
      )
      .innerJoin(
        RoleDescriptionEntity,
        'rd',
        'rd.role_id = tur.role_id AND rd.language_id = 1',
      )
      .where('tu.tenant_id = :tenantId', { tenantId })
      .andWhere('rd.name IN (:...adminNames)', {
        adminNames: [...TENANT_ADMIN_ROLE_NAMES],
      })
      .getRawMany<{ userId: string }>();

    return this.toUserIdSet(rows);
  }

  resolveTenantId(envelopeTenantId: unknown): number | null {
    if (envelopeTenantId == null || envelopeTenantId === '') {
      return null;
    }
    const parsed = Number(envelopeTenantId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private permissionMatchNames(permission: string): string[] {
    const trimmed = permission.trim();
    if (!trimmed.includes('.')) {
      return [trimmed];
    }
    const [module] = trimmed.split('.');
    return [trimmed, `${module}.manage`];
  }

  private toUserIdSet(rows: Array<{ userId: string }>): number[] {
    return [
      ...new Set(
        rows
          .map((row) => Number(row.userId))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
  }
}
