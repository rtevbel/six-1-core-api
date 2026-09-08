import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceAvailabilityEntity } from '../entities/resource_availability.entity';
import { ResourceBlackoutDateEntity } from '../entities/resource_blackout_date.entity';
import { UtcInterval } from './constraint.types';
import {
  expandRecurringInterval,
  UnsupportedRecurrenceRuleError,
} from './recurrence.expander';
import { dateOnlyUtc, eachDateInclusive, intervalsOverlap } from './interval.utils';

export interface ExpandedAvailabilityResult {
  windows: UtcInterval[];
  unsupportedRules: string[];
}

/**
 * Loads and expands resource availability / blackout windows for constraint checks.
 */
@Injectable()
export class ResourceAvailabilityAdapter {
  private readonly logger = new Logger(ResourceAvailabilityAdapter.name);

  constructor(
    @InjectRepository(ResourceAvailabilityEntity)
    private readonly availabilityRepo: Repository<ResourceAvailabilityEntity>,
    @InjectRepository(ResourceBlackoutDateEntity)
    private readonly blackoutRepo: Repository<ResourceBlackoutDateEntity>,
  ) {}

  async expandAvailability(
    resourceId: number,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<ExpandedAvailabilityResult> {
    const rows = await this.availabilityRepo.find({ where: { resourceId } });
    const windows: UtcInterval[] = [];
    const unsupportedRules: string[] = [];

    for (const row of rows) {
      if (!row.isRecurring) {
        if (
          intervalsOverlap(
            row.startTime,
            row.endTime,
            rangeStart,
            rangeEnd,
          )
        ) {
          windows.push({ startUtc: row.startTime, endUtc: row.endTime });
        }
        continue;
      }

      if (!row.recurrenceRule) {
        unsupportedRules.push('(missing recurrence_rule)');
        continue;
      }

      try {
        const expanded = expandRecurringInterval(
          row.startTime,
          row.endTime,
          row.recurrenceRule,
          rangeStart,
          rangeEnd,
        );
        windows.push(...expanded);
      } catch (err) {
        if (err instanceof UnsupportedRecurrenceRuleError) {
          unsupportedRules.push(err.rule);
          this.logger.warn(
            `Unsupported availability RRULE for resource ${resourceId}: ${err.rule}`,
          );
        } else {
          throw err;
        }
      }
    }

    return { windows, unsupportedRules };
  }

  async findBlackoutOverlaps(
    resourceId: number,
    startUtc: Date,
    endUtc: Date,
  ): Promise<ResourceBlackoutDateEntity[]> {
    const rows = await this.blackoutRepo.find({ where: { resourceId } });
    return rows.filter((b) => {
      // blackout dates are calendar dates; treat as [start 00:00, end+1day 00:00) UTC
      const dates = eachDateInclusive(String(b.startDate), String(b.endDate));
      if (!dates.length) return false;
      const spanStart = dateOnlyUtc(dates[0]).startUtc;
      const spanEnd = dateOnlyUtc(dates[dates.length - 1]).endUtc;
      return intervalsOverlap(startUtc, endUtc, spanStart, spanEnd);
    });
  }
}
