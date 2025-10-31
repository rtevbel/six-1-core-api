import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { CalendarProvider } from '../core/interfaces';
import { TenantConfigurationsEntity } from '../../tenants/tenant_configurations/entities/tenant_configuration.entity';
import { TenantUserConfigurationsEntity } from '../../tenants/tenant_users/tenant_user_configurations/entities/tenant_user_configuration.entity';
import { TenantWorkingHoursEntity } from '../../tenants/tenant_working_hours/entities/tenant_working_hour.entity';
import { TenantUserWorkingHoursEntity } from '../../tenants/tenant_users/tenant_user_working_hours/entities/tenant_user_working_hour.entity';
import { TenantOffDaysEntity } from '../../tenants/tenant_off_days/entities/tenant_off_day.entity';
import { TenantUserOffDaysEntity } from '../../tenants/tenant_users/tenant_user_off_days/entities/tenant_user_off_day.entity';

/**
 * CalendarAdapter
 * - Computes timezone, off-days, and working intervals by checking
 *   tenant-user settings first, then tenant-level fallbacks.
 */
@Injectable()
export class CalendarAdapter implements CalendarProvider {
  constructor(
    @InjectRepository(TenantUserConfigurationsEntity)
    private readonly tucRepo: Repository<TenantUserConfigurationsEntity>,
    @InjectRepository(TenantConfigurationsEntity)
    private readonly tcRepo: Repository<TenantConfigurationsEntity>,

    @InjectRepository(TenantUserWorkingHoursEntity)
    private readonly tuwhRepo: Repository<TenantUserWorkingHoursEntity>,
    @InjectRepository(TenantWorkingHoursEntity)
    private readonly twhRepo: Repository<TenantWorkingHoursEntity>,

    @InjectRepository(TenantUserOffDaysEntity)
    private readonly tuodRepo: Repository<TenantUserOffDaysEntity>,
    @InjectRepository(TenantOffDaysEntity)
    private readonly todRepo: Repository<TenantOffDaysEntity>,
  ) {}

  async getTimezone(tenantId: number, tenantUserId?: number): Promise<string> {
    if (tenantUserId) {
      const tuc = await this.tucRepo.findOne({ where: { tenantUserId } });
      if (tuc?.timezone) return tuc.timezone;
    }
    const tc = await this.tcRepo.findOne({ where: { tenantId } });
    return tc?.timezone || 'UTC';
  }

  async isOffDateLocal(
    tenantId: number,
    tenantUserId: number | undefined,
    isoDate: string,
  ): Promise<boolean> {
    // Check user off day first
    if (tenantUserId) {
      const u = await this.tuodRepo.findOne({ where: { tenantUserId, offDate: Raw(() => `DATE('${isoDate}')`) } });
      if (u) return true;
    }
    // Fallback to tenant-wide holiday
    const t = await this.todRepo.findOne({ where: { tenantId, offDate: Raw(() => `DATE('${isoDate}')`) } });
    return !!t;
  }

  async getWorkingIntervalsLocal(
    tenantId: number,
    tenantUserId: number | undefined,
    isoDate: string,
    weekday: number, // 1..7 Mon..Sun
  ): Promise<Array<{ start: string; end: string }>> {
    const dayMap = ['','monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
    const dayOfWeek = dayMap[weekday] as (typeof dayMap)[number];

    // User working hours first
    if (tenantUserId) {
      const userSlots = await this.tuwhRepo.find({
        where: { tenantUserId, dayOfWeek },
        order: { startTime: 'ASC' },
      });
      if (userSlots.length) {
        return userSlots.map(s => ({ start: s.startTime.slice(0,5), end: s.endTime.slice(0,5) }));
      }
    }

    // Tenant working hours fallback
    const tenantSlots = await this.twhRepo.find({
      where: { tenantId, dayOfWeek },
      order: { startTime: 'ASC' },
    });
    return tenantSlots.map(s => ({ start: s.startTime.slice(0,5), end: s.endTime.slice(0,5) }));
  }
}
