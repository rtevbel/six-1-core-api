import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../../../tenants/entities/tenant.entity';
import type { NotificationContext } from '../notification-context.types';
import type { NormalizedNotificationContextSource } from '../notification-context-source.util';

/**
 * Hydrates `tenant.*` from tenant id on the normalized source.
 */
@Injectable()
export class TenantContextProvider {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
  ) {}

  async apply(
    context: NotificationContext,
    source: NormalizedNotificationContextSource,
  ): Promise<void> {
    if (!source.tenantId) {
      return;
    }

    context.tenant.id = source.tenantId;

    const tenant = await this.tenantRepository.findOne({
      where: { tenantId: source.tenantId },
    });
    context.tenant.name = tenant?.name ?? null;
  }
}
