import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { CALENDAR_PROVIDER, TASK_CONTEXT_PROVIDER } from '../constants';
import { CalendarProvider, TaskContextProvider } from '../core/interfaces';
import {
  weekdayFromLuxon,
  buildIntervalsForDay,
  isWithinAnyInterval,
  nextStartAfter,
} from '../core/time_utils';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';
import { ResourceEntity } from '../entities/resource.entity';
import { ResourceAssignmentEntity } from '../entities/resource_assignment.entity';
import { ResourceMetaEntity } from '../entities/resource_meta.entity';
import { TenantTeamMemberEntity } from '../../tenants/tenant_teams/tenant_team_members/entities/tenant_team_member.entity';
import { DependencyResolverService } from '../services/dependency_resolver.service';
import { ResourceAvailabilityAdapter } from './resource-availability.adapter';
import { ConstraintConflictCode } from './constraint.codes';
import {
  ConflictQuery,
  ConstraintConflict,
  ConstraintResult,
  FitWindowRequest,
  FittedWindow,
  PlacementRequest,
  UtilizationBucket,
  UtilizationQuery,
  UtilizationResult,
} from './constraint.types';
import {
  busyMsWithinRange,
  intervalMs,
  isFullyCoveredBy,
} from './interval.utils';

const TEAM_OVERLOAD_THRESHOLD = 0.9;
const META_EXPIRY_KEYS = [
  'license_expiry',
  'epa_cert_expiry',
  'cert_expiry',
  'certificate_expiry',
] as const;

/**
 * Shared constraint & capacity engine for live execution and (later) scenarios.
 */
@Injectable()
export class ConstraintCapacityEngine {
  private readonly logger = new Logger(ConstraintCapacityEngine.name);

  constructor(
    @Inject(CALENDAR_PROVIDER) private readonly calendar: CalendarProvider,
    @Inject(TASK_CONTEXT_PROVIDER)
    private readonly taskCtx: TaskContextProvider,
    private readonly deps: DependencyResolverService,
    private readonly resourceAvailability: ResourceAvailabilityAdapter,
    @InjectRepository(ScheduledTaskEntity)
    private readonly schedRepo: Repository<ScheduledTaskEntity>,
    @InjectRepository(ResourceEntity)
    private readonly resourceRepo: Repository<ResourceEntity>,
    @InjectRepository(ResourceAssignmentEntity)
    private readonly assignmentRepo: Repository<ResourceAssignmentEntity>,
    @InjectRepository(ResourceMetaEntity)
    private readonly resourceMetaRepo: Repository<ResourceMetaEntity>,
    @InjectRepository(TenantTeamMemberEntity)
    private readonly teamMemberRepo: Repository<TenantTeamMemberEntity>,
  ) {}

  /**
   * Fits a requested window into working calendars and optionally applies
   * dependency gates + task start/finish constraints.
   */
  async fitWindow(request: FitWindowRequest): Promise<FittedWindow> {
    let reqStart = DateTime.fromJSDate(request.requestedStartUtc);
    let reqEnd = request.requestedEndUtc
      ? DateTime.fromJSDate(request.requestedEndUtc)
      : null;

    let dependencyGateUtc: Date | null = null;
    let taskCtx: Awaited<ReturnType<TaskContextProvider['getTaskContext']>> |
      null = null;

    if (request.taskId && request.applyTaskConstraints !== false) {
      taskCtx = await this.taskCtx.getTaskContext(request.taskId);
    }

    if (request.taskId && request.applyDependencyGate !== false) {
      dependencyGateUtc = await this.deps.earliestGateUtc(request.taskId);
      if (dependencyGateUtc) {
        const g = DateTime.fromJSDate(dependencyGateUtc);
        if (reqStart < g) reqStart = g;
      }
    }

    if (taskCtx?.startConstraintType) {
      const adjusted = this.applyTaskStartConstraints(
        reqStart,
        reqEnd,
        taskCtx,
      );
      reqStart = adjusted.start;
      reqEnd = adjusted.end;
    }

    if (reqEnd && reqEnd < reqStart) {
      reqEnd = reqStart.plus({ minutes: 1 });
    }

    // Derive duration from mode when end missing / after constraint adjustments
    let durationMs = request.durationMs;
    if (durationMs === undefined) {
      if (reqEnd) {
        durationMs = Math.max(
          0,
          reqEnd.diff(reqStart, 'milliseconds').milliseconds,
        );
      } else if (taskCtx) {
        durationMs = this.resolveDurationMsFromTask(taskCtx);
      } else {
        durationMs = 0;
      }
    }

    const tz = await this.calendar.getTimezone(
      request.tenantId,
      request.tenantUserId ?? undefined,
    );
    const effStart = await this.nextAllowedUtc(
      request.tenantId,
      request.tenantUserId ?? null,
      reqStart.toJSDate(),
      tz,
    );
    const effEnd = await this.addDurationWithinWorkingHours(
      request.tenantId,
      request.tenantUserId ?? null,
      effStart,
      durationMs ?? 0,
      tz,
    );

    return {
      effectiveStartUtc: effStart,
      effectiveEndUtc: DateTime.max(
        DateTime.fromJSDate(effStart),
        DateTime.fromJSDate(effEnd),
      ).toJSDate(),
      tzUsed: tz,
      dependencyGateUtc,
    };
  }

  /**
   * Validates a concrete placement against calendars, capacity, deps, and meta.
   */
  async validatePlacement(request: PlacementRequest): Promise<ConstraintResult> {
    const hard: ConstraintConflict[] = [];
    const soft: ConstraintConflict[] = [];

    if (
      !(request.startUtc instanceof Date) ||
      !(request.endUtc instanceof Date) ||
      Number.isNaN(request.startUtc.getTime()) ||
      Number.isNaN(request.endUtc.getTime()) ||
      request.endUtc.getTime() <= request.startUtc.getTime()
    ) {
      hard.push({
        code: ConstraintConflictCode.INVALID_WINDOW,
        severity: 'hard',
        message: 'Placement end must be after start',
      });
      return { ok: false, hard, soft };
    }

    if (request.horizonStartUtc && request.startUtc < request.horizonStartUtc) {
      hard.push({
        code: ConstraintConflictCode.OUTSIDE_HORIZON,
        severity: 'hard',
        message: 'Placement starts before planning horizon',
        details: { horizonStartUtc: request.horizonStartUtc.toISOString() },
      });
    }
    if (request.horizonEndUtc && request.endUtc > request.horizonEndUtc) {
      hard.push({
        code: ConstraintConflictCode.OUTSIDE_HORIZON,
        severity: 'hard',
        message: 'Placement ends after planning horizon',
        details: { horizonEndUtc: request.horizonEndUtc.toISOString() },
      });
    }

    // Calendar closed at start (and sample mid-window for parent/shift modes)
    const calendarSubject =
      request.mode === 'parent_window' ? null : request.tenantUserId ?? null;
    const startClosed = await this.isCalendarClosedAt(
      request.tenantId,
      calendarSubject,
      request.startUtc,
    );
    if (startClosed) {
      hard.push({
        code: ConstraintConflictCode.CALENDAR_CLOSED,
        severity: 'hard',
        message: 'Start time falls outside working hours or on an off day',
        details: { at: request.startUtc.toISOString() },
      });
    }

    if (request.taskId && request.mode !== 'assignment') {
      await this.collectDependencyConflicts(request, hard);
      await this.collectTaskConstraintConflicts(request, hard, soft);
    }

    if (request.tenantUserId) {
      await this.collectUserOverlapConflicts(request, hard);
    }

    if (request.resourceId) {
      await this.collectResourceConflicts(request, hard, soft);
    }

    if (request.teamId) {
      await this.collectTeamOverloadSoft(request, soft);
    }

    const ok =
      hard.length === 0 &&
      (request.failOnSoft ? soft.length === 0 : true);

    return { ok, hard, soft };
  }

  async findConflicts(query: ConflictQuery): Promise<ConstraintConflict[]> {
    const all: ConstraintConflict[] = [];
    for (const placement of query.placements) {
      const result = await this.validatePlacement({
        tenantId: query.tenantId,
        taskId: placement.taskId,
        tenantUserId: placement.tenantUserId,
        resourceId: placement.resourceId,
        startUtc: placement.startUtc,
        endUtc: placement.endUtc,
        excludeScheduledTaskIds: placement.excludeScheduledTaskIds,
        mode: placement.resourceId ? 'assignment' : 'shift',
      });
      const tagged = [...result.hard, ...result.soft].map((c) => ({
        ...c,
        details: {
          ...c.details,
          placementKey: placement.key,
        },
      }));
      all.push(...tagged);
    }
    return all;
  }

  async expandAvailability(
    resourceId: number,
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    return this.resourceAvailability.expandAvailability(
      resourceId,
      rangeStart,
      rangeEnd,
    );
  }

  async utilization(query: UtilizationQuery): Promise<UtilizationResult> {
    const buckets: UtilizationBucket[] = [];

    if (query.teamId) {
      const members = await this.teamMemberRepo.find({
        where: { tenantTeamId: query.teamId },
      });
      const userIds = members.map((m) => m.tenantUserId);
      let availableMs = 0;
      let busyMs = 0;
      for (const uid of userIds) {
        const u = await this.utilizationForUser(
          query.tenantId,
          uid,
          query.fromUtc,
          query.toUtc,
        );
        availableMs += u.availableMs;
        busyMs += u.busyMs;
      }
      buckets.push({
        subjectType: 'team',
        subjectId: query.teamId,
        availableMs,
        busyMs,
        utilizationRatio: availableMs > 0 ? busyMs / availableMs : 0,
      });
    }

    const userIds = new Set(query.tenantUserIds ?? []);
    if (query.resourceIds?.length) {
      const resources = await this.resourceRepo.find({
        where: { resourceId: In(query.resourceIds) },
      });
      for (const r of resources) {
        if (r.type === 'human' && r.tenantUserId) {
          userIds.add(r.tenantUserId);
        } else if (r.type === 'equipment') {
          buckets.push(
            await this.utilizationForEquipment(
              r.resourceId,
              query.fromUtc,
              query.toUtc,
            ),
          );
        }
      }
    }

    for (const uid of userIds) {
      buckets.push(
        await this.utilizationForUser(
          query.tenantId,
          uid,
          query.fromUtc,
          query.toUtc,
        ),
      );
    }

    return {
      fromUtc: query.fromUtc,
      toUtc: query.toUtc,
      buckets,
    };
  }

  /* ---------- calendar fit helpers (shared with live execution) ---------- */

  async nextAllowedUtc(
    tenantId: number,
    tenantUserId: number | null,
    requestedUtc: Date,
    tz: string,
  ): Promise<Date> {
    let cursor = DateTime.fromJSDate(requestedUtc, { zone: 'utc' }).setZone(tz);
    for (let i = 0; i < 366; i++) {
      const dateStr = cursor.toISODate() ?? '';
      const isOff = await this.calendar.isOffDateLocal(
        tenantId,
        tenantUserId ?? undefined,
        dateStr,
      );
      const weekday = weekdayFromLuxon(cursor);
      const slots = isOff
        ? []
        : await this.calendar.getWorkingIntervalsLocal(
            tenantId,
            tenantUserId ?? undefined,
            dateStr,
            weekday,
          );
      const intervals = buildIntervalsForDay(cursor, slots);
      if (intervals.length) {
        if (isWithinAnyInterval(cursor, intervals)) {
          return cursor.setZone('utc').toJSDate();
        }
        const nxt = nextStartAfter(cursor, intervals);
        if (nxt) return nxt.setZone('utc').toJSDate();
      }
      cursor = cursor.plus({ days: 1 }).startOf('day');
    }
    return DateTime.fromJSDate(requestedUtc, { zone: 'utc' }).toJSDate();
  }

  async addDurationWithinWorkingHours(
    tenantId: number,
    tenantUserId: number | null,
    startUtc: Date,
    durationMs: number,
    tz: string,
  ): Promise<Date> {
    if (durationMs <= 0) return startUtc;

    let pointerLocal = DateTime.fromJSDate(startUtc, { zone: 'utc' }).setZone(
      tz,
    );
    let remaining = durationMs;

    for (let i = 0; i < 366 && remaining > 0; i++) {
      const dayStart = pointerLocal.startOf('day');
      const dateStr = pointerLocal.toISODate() ?? '';
      const isOff = await this.calendar.isOffDateLocal(
        tenantId,
        tenantUserId ?? undefined,
        dateStr,
      );
      const weekday = weekdayFromLuxon(pointerLocal);
      const slots = isOff
        ? []
        : await this.calendar.getWorkingIntervalsLocal(
            tenantId,
            tenantUserId ?? undefined,
            dateStr,
            weekday,
          );
      const intervals = buildIntervalsForDay(pointerLocal, slots);

      if (intervals.length) {
        for (const interval of intervals) {
          const intervalStart = interval.start;
          const intervalEnd = interval.end;
          if (!intervalStart || !intervalEnd) continue;

          const usableStart =
            pointerLocal > intervalStart ? pointerLocal : intervalStart;
          if (usableStart >= intervalEnd) continue;

          const available = intervalEnd.diff(
            usableStart,
            'milliseconds',
          ).milliseconds;
          if (available >= remaining) {
            return usableStart
              .plus({ milliseconds: remaining })
              .setZone('utc')
              .toJSDate();
          }

          remaining -= available;
          pointerLocal = intervalEnd;
        }
      }

      pointerLocal = dayStart.plus({ days: 1 });
    }

    return DateTime.fromJSDate(startUtc, { zone: 'utc' })
      .plus({ milliseconds: durationMs })
      .toJSDate();
  }

  /* ---------- private collectors ---------- */

  private applyTaskStartConstraints(
    reqStart: DateTime,
    reqEnd: DateTime | null,
    ctx: Awaited<ReturnType<TaskContextProvider['getTaskContext']>>,
  ): { start: DateTime; end: DateTime | null } {
    let start = reqStart;
    let end = reqEnd;
    if (!ctx.startConstraintType) return { start, end };

    const c = ctx.startConstraintUtc
      ? DateTime.fromJSDate(ctx.startConstraintUtc)
      : null;

    switch (ctx.startConstraintType) {
      case 'NoEarlierThan':
        if (c && start < c) start = c;
        break;
      case 'On':
      case 'MustStartOn':
        if (c) start = c;
        break;
      case 'MustFinishOn':
        if (ctx.finishConstraintUtc) {
          end = DateTime.fromJSDate(ctx.finishConstraintUtc);
          if (start > end) start = end.minus({ minutes: 1 });
        }
        break;
      case 'NoLaterThan':
      case 'ASAP':
      default:
        break;
    }
    return { start, end };
  }

  private resolveDurationMsFromTask(
    ctx: Awaited<ReturnType<TaskContextProvider['getTaskContext']>>,
  ): number {
    const hours =
      ctx.schedulingMode === 'fixed_effort'
        ? Number(ctx.effortHours ?? ctx.estimatedDuration ?? 0)
        : Number(ctx.estimatedDuration ?? ctx.effortHours ?? 0);
    if (!Number.isFinite(hours) || hours <= 0) return 0;
    return hours * 60 * 60 * 1000;
  }

  private async isCalendarClosedAt(
    tenantId: number,
    tenantUserId: number | null,
    atUtc: Date,
  ): Promise<boolean> {
    const tz = await this.calendar.getTimezone(
      tenantId,
      tenantUserId ?? undefined,
    );
    const local = DateTime.fromJSDate(atUtc, { zone: 'utc' }).setZone(tz);
    const dateStr = local.toISODate() ?? '';
    if (await this.calendar.isOffDateLocal(tenantId, tenantUserId ?? undefined, dateStr)) {
      return true;
    }
    const slots = await this.calendar.getWorkingIntervalsLocal(
      tenantId,
      tenantUserId ?? undefined,
      dateStr,
      weekdayFromLuxon(local),
    );
    if (!slots.length) return true;
    const intervals = buildIntervalsForDay(local, slots);
    return !isWithinAnyInterval(local, intervals);
  }

  private async collectDependencyConflicts(
    request: PlacementRequest,
    hard: ConstraintConflict[],
  ): Promise<void> {
    if (!request.taskId) return;
    const gate = await this.deps.earliestGateUtc(request.taskId);
    if (gate && request.startUtc < gate) {
      hard.push({
        code: ConstraintConflictCode.DEPENDENCY_GATE,
        severity: 'hard',
        message: 'Start is before dependency gate',
        details: {
          dependencyGateUtc: gate.toISOString(),
          startUtc: request.startUtc.toISOString(),
        },
      });
    }
  }

  private async collectTaskConstraintConflicts(
    request: PlacementRequest,
    hard: ConstraintConflict[],
    soft: ConstraintConflict[],
  ): Promise<void> {
    if (!request.taskId) return;
    const ctx = await this.taskCtx.getTaskContext(request.taskId);
    if (!ctx.startConstraintType) return;

    const start = DateTime.fromJSDate(request.startUtc);
    const end = DateTime.fromJSDate(request.endUtc);
    const c = ctx.startConstraintUtc
      ? DateTime.fromJSDate(ctx.startConstraintUtc)
      : null;

    switch (ctx.startConstraintType) {
      case 'NoEarlierThan':
        if (c && start < c) {
          hard.push({
            code: ConstraintConflictCode.TASK_CONSTRAINT,
            severity: 'hard',
            message: 'Violates NoEarlierThan start constraint',
            details: { constraintUtc: c.toISO() },
          });
        }
        break;
      case 'On':
      case 'MustStartOn':
        if (c && start.toMillis() !== c.toMillis()) {
          hard.push({
            code: ConstraintConflictCode.TASK_CONSTRAINT,
            severity: 'hard',
            message: `Violates ${ctx.startConstraintType} start constraint`,
            details: { constraintUtc: c.toISO() },
          });
        }
        break;
      case 'NoLaterThan':
        if (c && start > c) {
          hard.push({
            code: ConstraintConflictCode.TASK_CONSTRAINT,
            severity: 'hard',
            message: 'Violates NoLaterThan start constraint',
            details: { constraintUtc: c.toISO() },
          });
        }
        break;
      case 'MustFinishOn':
        if (ctx.finishConstraintUtc) {
          const f = DateTime.fromJSDate(ctx.finishConstraintUtc);
          if (end.toMillis() !== f.toMillis()) {
            soft.push({
              code: ConstraintConflictCode.TASK_CONSTRAINT,
              severity: 'soft',
              message: 'End does not match MustFinishOn constraint',
              details: { finishConstraintUtc: f.toISO() },
            });
          }
        }
        break;
      default:
        break;
    }
  }

  private async collectUserOverlapConflicts(
    request: PlacementRequest,
    hard: ConstraintConflict[],
  ): Promise<void> {
    if (!request.tenantUserId) return;
    const qb = this.schedRepo
      .createQueryBuilder('s')
      .where('s.tenant_user_id = :uid', { uid: request.tenantUserId })
      .andWhere('s.is_active = 1')
      .andWhere(
        '(s.effective_start_utc < :to) AND (s.effective_end_utc > :from)',
        { from: request.startUtc, to: request.endUtc },
      );
    if (request.excludeScheduledTaskIds?.length) {
      qb.andWhere('s.scheduled_task_id NOT IN (:...exclude)', {
        exclude: request.excludeScheduledTaskIds,
      });
    }
    const overlaps = await qb.getMany();
    if (overlaps.length) {
      hard.push({
        code: ConstraintConflictCode.USER_OVERLAP,
        severity: 'hard',
        message: 'Assignee has overlapping active schedule(s)',
        details: {
          overlappingScheduledTaskIds: overlaps.map((o) => o.scheduledTaskId),
        },
      });
    }
  }

  private async collectResourceConflicts(
    request: PlacementRequest,
    hard: ConstraintConflict[],
    soft: ConstraintConflict[],
  ): Promise<void> {
    if (!request.resourceId) return;
    const resource = await this.resourceRepo.findOne({
      where: { resourceId: request.resourceId },
    });
    if (!resource) {
      hard.push({
        code: ConstraintConflictCode.RESOURCE_UNAVAILABLE,
        severity: 'hard',
        message: `Resource ${request.resourceId} not found`,
      });
      return;
    }

    // Availability windows (if any configured, placement must be covered)
    const { windows, unsupportedRules } =
      await this.resourceAvailability.expandAvailability(
        request.resourceId,
        request.startUtc,
        request.endUtc,
      );
    for (const rule of unsupportedRules) {
      hard.push({
        code: ConstraintConflictCode.AVAILABILITY_RULE_UNSUPPORTED,
        severity: 'hard',
        message: 'Resource has an unsupported availability recurrence rule',
        details: { rule },
      });
    }
    if (windows.length > 0) {
      if (!isFullyCoveredBy(request.startUtc, request.endUtc, windows)) {
        hard.push({
          code: ConstraintConflictCode.RESOURCE_UNAVAILABLE,
          severity: 'hard',
          message: 'Placement is outside resource availability windows',
          details: { resourceId: request.resourceId },
        });
      }
    }

    const blackouts = await this.resourceAvailability.findBlackoutOverlaps(
      request.resourceId,
      request.startUtc,
      request.endUtc,
    );
    if (blackouts.length) {
      hard.push({
        code: ConstraintConflictCode.RESOURCE_BLACKOUT,
        severity: 'hard',
        message: 'Placement overlaps a resource blackout',
        details: {
          blackoutIds: blackouts.map((b) => b.blackoutId),
        },
      });
    }

    if (resource.type === 'equipment') {
      const overlaps = await this.assignmentRepo
        .createQueryBuilder('a')
        .where('a.resource_id = :rid', { rid: request.resourceId })
        .andWhere(
          '(a.assigned_start < :to) AND (a.assigned_end > :from)',
          { from: request.startUtc, to: request.endUtc },
        )
        .getMany();

      const filtered = overlaps.filter((a) => {
        if (!request.excludeScheduledTaskIds?.length) return true;
        if (a.scheduledTaskId == null) return true;
        return !request.excludeScheduledTaskIds.includes(a.scheduledTaskId);
      });

      if (filtered.length) {
        hard.push({
          code: ConstraintConflictCode.EQUIPMENT_OVERLAP,
          severity: 'hard',
          message: 'Equipment is already assigned in an overlapping window',
          details: {
            overlappingAssignmentIds: filtered.map((a) => a.resourceAssignmentId),
          },
        });
      }
    }

    if (resource.type === 'human' && resource.tenantUserId) {
      // Also check the linked user's busy calendar when validating via resourceId
      await this.collectUserOverlapConflicts(
        { ...request, tenantUserId: resource.tenantUserId },
        hard,
      );
    }

    await this.collectMetaRuleConflicts(request, soft, hard);
  }

  private async collectMetaRuleConflicts(
    request: PlacementRequest,
    soft: ConstraintConflict[],
    hard: ConstraintConflict[],
  ): Promise<void> {
    if (!request.resourceId) return;
    const meta = await this.resourceMetaRepo.findOne({
      where: { resourceId: request.resourceId },
    });
    if (!meta?.metaJson) return;

    for (const key of META_EXPIRY_KEYS) {
      const raw = meta.metaJson[key];
      if (raw == null) continue;
      const expiry = DateTime.fromISO(String(raw), { zone: 'utc' });
      if (!expiry.isValid) continue;
      if (DateTime.fromJSDate(request.endUtc) > expiry) {
        hard.push({
          code: ConstraintConflictCode.META_RULE,
          severity: 'hard',
          message: `Resource ${key} expires before placement end`,
          details: { key, expiry: expiry.toISO() },
        });
      } else if (
        DateTime.fromJSDate(request.endUtc).plus({ days: 14 }) > expiry
      ) {
        soft.push({
          code: ConstraintConflictCode.META_RULE,
          severity: 'soft',
          message: `Resource ${key} expires within 14 days of placement`,
          details: { key, expiry: expiry.toISO() },
        });
      }
    }
  }

  private async collectTeamOverloadSoft(
    request: PlacementRequest,
    soft: ConstraintConflict[],
  ): Promise<void> {
    if (!request.teamId) return;
    const util = await this.utilization({
      tenantId: request.tenantId,
      fromUtc: request.startUtc,
      toUtc: request.endUtc,
      teamId: request.teamId,
    });
    const team = util.buckets.find((b) => b.subjectType === 'team');
    if (team && team.utilizationRatio >= TEAM_OVERLOAD_THRESHOLD) {
      soft.push({
        code: ConstraintConflictCode.TEAM_OVERLOAD,
        severity: 'soft',
        message: 'Team utilization is at or above 90% for this window',
        details: {
          teamId: request.teamId,
          utilizationRatio: team.utilizationRatio,
        },
      });
    }
  }

  private async utilizationForUser(
    tenantId: number,
    tenantUserId: number,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<UtilizationBucket> {
    const availableMs = await this.estimateWorkingMs(
      tenantId,
      tenantUserId,
      fromUtc,
      toUtc,
    );
    const busyRows = await this.schedRepo
      .createQueryBuilder('s')
      .where('s.tenant_user_id = :uid', { uid: tenantUserId })
      .andWhere('s.is_active = 1')
      .andWhere(
        '(s.effective_start_utc < :to) AND (s.effective_end_utc > :from)',
        { from: fromUtc, to: toUtc },
      )
      .getMany();
    const busyMs = busyMsWithinRange(
      busyRows.map((r) => ({
        startUtc: r.effectiveStartUtc,
        endUtc: r.effectiveEndUtc,
      })),
      fromUtc,
      toUtc,
    );
    return {
      subjectType: 'user',
      subjectId: tenantUserId,
      availableMs,
      busyMs,
      utilizationRatio: availableMs > 0 ? busyMs / availableMs : 0,
    };
  }

  private async utilizationForEquipment(
    resourceId: number,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<UtilizationBucket> {
    const assignments = await this.assignmentRepo
      .createQueryBuilder('a')
      .where('a.resource_id = :rid', { rid: resourceId })
      .andWhere('(a.assigned_start < :to) AND (a.assigned_end > :from)', {
        from: fromUtc,
        to: toUtc,
      })
      .getMany();
    const rangeMs = intervalMs(fromUtc, toUtc);
    const busyMs = busyMsWithinRange(
      assignments.map((a) => ({
        startUtc: a.assignedStart,
        endUtc: a.assignedEnd,
      })),
      fromUtc,
      toUtc,
    );
    return {
      subjectType: 'equipment',
      subjectId: resourceId,
      availableMs: rangeMs,
      busyMs,
      utilizationRatio: rangeMs > 0 ? busyMs / rangeMs : 0,
    };
  }

  private async estimateWorkingMs(
    tenantId: number,
    tenantUserId: number,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<number> {
    const tz = await this.calendar.getTimezone(tenantId, tenantUserId);
    let cursor = DateTime.fromJSDate(fromUtc, { zone: 'utc' }).setZone(tz);
    const end = DateTime.fromJSDate(toUtc, { zone: 'utc' }).setZone(tz);
    let total = 0;
    for (let i = 0; i < 366 && cursor < end; i++) {
      const dateStr = cursor.toISODate() ?? '';
      const isOff = await this.calendar.isOffDateLocal(
        tenantId,
        tenantUserId,
        dateStr,
      );
      if (!isOff) {
        const slots = await this.calendar.getWorkingIntervalsLocal(
          tenantId,
          tenantUserId,
          dateStr,
          weekdayFromLuxon(cursor),
        );
        const intervals = buildIntervalsForDay(cursor, slots);
        for (const interval of intervals) {
          if (!interval.start || !interval.end) continue;
          const s = DateTime.max(interval.start, cursor);
          const e = DateTime.min(interval.end, end);
          if (e > s) total += e.diff(s, 'milliseconds').milliseconds;
        }
      }
      cursor = cursor.startOf('day').plus({ days: 1 });
    }
    return total;
  }
}
