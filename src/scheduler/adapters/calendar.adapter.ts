import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarProvider, TimeInterval, Weekday } from '../core/interfaces';
import { TenantConfigurationsEntity } from '../../tenants/tenant_configurations/entities/tenant_configuration.entity';
import { TenantUserConfigurationsEntity } from '../../tenants/tenant_users/tenant_user_configurations/entities/tenant_user_configuration.entity';
import { TenantWorkingHoursEntity } from '../../tenants/tenant_working_hours/entities/tenant_working_hour.entity';
import { TenantUserWorkingHoursEntity } from '../../tenants/tenant_users/tenant_user_working_hours/entities/tenant_user_working_hour.entity';
import { TenantOffDaysEntity } from '../../tenants/tenant_off_days/entities/tenant_off_day.entity';
import { TenantUserOffDaysEntity } from '../../tenants/tenant_users/tenant_user_off_days/entities/tenant_user_off_day.entity';

/**
 * CalendarAdapter is an implementation of the CalendarProvider interface.
 * It provides methods to retrieve timezone, check off dates, and get working intervals
 * for tenants and tenant users.
 */
@Injectable()
export class CalendarAdapter implements CalendarProvider {
  constructor(
    @InjectRepository(TenantConfigurationsEntity)
    private readonly tenantCfgRepo: Repository<TenantConfigurationsEntity>,
    @InjectRepository(TenantUserConfigurationsEntity)
    private readonly userCfgRepo: Repository<TenantUserConfigurationsEntity>,
    @InjectRepository(TenantWorkingHoursEntity)
    private readonly tenantHoursRepo: Repository<TenantWorkingHoursEntity>,
    @InjectRepository(TenantUserWorkingHoursEntity)
    private readonly userHoursRepo: Repository<TenantUserWorkingHoursEntity>,
    @InjectRepository(TenantOffDaysEntity)
    private readonly tenantOffRepo: Repository<TenantOffDaysEntity>,
    @InjectRepository(TenantUserOffDaysEntity)
    private readonly userOffRepo: Repository<TenantUserOffDaysEntity>,
  ) {}

  /**
   * Retrieves the timezone for a given tenant or tenant user.
   * If a tenant user ID is provided, their timezone is prioritized.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The optional ID of the tenant user.
   * @returns A promise that resolves to the timezone string.
   */
  async getTimezone(tenantId: number, tenantUserId?: number | null): Promise<string> {
    if (tenantUserId) {
      const u = await this.userCfgRepo.findOne({ where: { tenantUserId } });
      if (u?.timezone) return u.timezone;
    }
    const t = await this.tenantCfgRepo.findOne({ where: { tenantId } });
    return t?.timezone || 'UTC';
  }

  /**
   * Checks if a given date is an off date (non-working day) for a tenant or tenant user.
   * If a tenant user ID is provided, their off dates are prioritized.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The optional ID of the tenant user.
   * @param localISODate - The date in ISO format (e.g., 'YYYY-MM-DD').
   * @returns A promise that resolves to a boolean indicating if the date is an off date.
   */
  async isOffDateLocal(
    tenantId: number,
    tenantUserId: number | null | undefined,
    localISODate: string,
  ): Promise<boolean> {
    if (tenantUserId) {
      const found = await this.userOffRepo.findOne({ where: { tenantUserId, offDate: new Date(localISODate) } });
      if (found) return true;
    }
    const t = await this.tenantOffRepo.findOne({ where: { tenantId, offDate: new Date(localISODate) } });
    return !!t;
  }

  /**
   * Retrieves the working intervals for a specific day and weekday for a tenant or tenant user.
   * If a tenant user ID is provided, their working hours are prioritized.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The optional ID of the tenant user.
   * @param _date - The date (not used in this implementation).
   * @param weekday - The day of the week.
   * @returns A promise that resolves to an array of time intervals.
   */
  async getWorkingIntervalsLocal(
    tenantId: number,
    tenantUserId: number | null | undefined,
    _date: string,
    weekday: Weekday,
  ): Promise<TimeInterval[]> {
    if (tenantUserId) {
      const uh = await this.userHoursRepo.find({ where: { tenantUserId, dayOfWeek: weekday } });
      if (uh.length) return uh.map((r) => ({ start: r.startTime, end: r.endTime }));
    }
    const th = await this.tenantHoursRepo.find({ where: { tenantId, dayOfWeek: weekday } });
    return th.map((r) => ({ start: r.startTime, end: r.endTime }));
  }
}