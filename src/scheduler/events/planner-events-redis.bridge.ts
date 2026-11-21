import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import {
  REDIS_DATABASE_HOST_KEY,
  REDIS_DATABASE_PASSWORD_KEY,
  REDIS_DATABASE_PORT_KEY,
} from '../../auth/constants';
import {
  PLANNER_EVENTS_REDIS_CHANNEL_PREFIX,
  PLANNER_EVENTS_REDIS_CHANNEL_SUFFIX,
  SCHEDULER_DOMAIN_EVENT_CONFLICTS_CHANGED,
  SCHEDULER_DOMAIN_EVENT_SCENARIO_PROMOTED,
  SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED,
} from '../constants';
import { PlannerNotifyPayload } from '../interfaces/planner-events.interface';

type DomainPayload = {
  tenantId: number;
  requirementId?: number;
  schedulingRequirementId?: number;
  scheduleScenarioId?: number | null;
  scenarioId?: number | null;
  revision?: number | null;
  actorId?: number | null;
  actorUserId?: number | null;
  count?: number;
};

/**
 * Bridges in-process scheduler domain events → Redis pub/sub for Gateway SSE.
 * Fail-open: publish errors are logged and never fail the originating write.
 */
@Injectable()
export class PlannerEventsRedisBridge
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PlannerEventsRedisBridge.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      const host = this.config.get<string>(REDIS_DATABASE_HOST_KEY);
      const port = this.config.get<number>(REDIS_DATABASE_PORT_KEY);
      if (!host || !port) {
        this.logger.warn(
          'Planner events Redis bridge disabled: REDIS host/port missing',
        );
        return;
      }
      this.client = new Redis({
        host,
        port,
        password: this.config.get<string>(REDIS_DATABASE_PASSWORD_KEY) || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      await this.client.connect();
      this.logger.log('Planner events Redis bridge connected');
    } catch (err) {
      this.logger.warn(
        `Planner events Redis bridge init failed (fail-open): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      this.client = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
    this.client = null;
  }

  @OnEvent(SCHEDULER_DOMAIN_EVENT_SCENARIO_UPDATED)
  async onScenarioUpdated(payload: DomainPayload): Promise<void> {
    await this.publish({
      type: 'scheduler.scenario.updated',
      tenantId: payload.tenantId,
      requirementId: this.requirementId(payload),
      scenarioId: this.scenarioId(payload),
      revision: payload.revision ?? null,
      changedAt: new Date().toISOString(),
      actorId: payload.actorId ?? payload.actorUserId ?? null,
    });
  }

  @OnEvent(SCHEDULER_DOMAIN_EVENT_SCENARIO_PROMOTED)
  async onScenarioPromoted(payload: DomainPayload): Promise<void> {
    await this.publish({
      type: 'scheduler.scenario.promoted',
      tenantId: payload.tenantId,
      requirementId: this.requirementId(payload),
      scenarioId: this.scenarioId(payload),
      revision: payload.revision ?? null,
      changedAt: new Date().toISOString(),
      actorId: payload.actorId ?? payload.actorUserId ?? null,
    });
  }

  @OnEvent(SCHEDULER_DOMAIN_EVENT_CONFLICTS_CHANGED)
  async onConflictsChanged(payload: DomainPayload): Promise<void> {
    await this.publish({
      type: 'scheduler.conflicts.changed',
      tenantId: payload.tenantId,
      requirementId: this.requirementId(payload),
      scenarioId: this.scenarioId(payload),
      revision: payload.revision ?? null,
      changedAt: new Date().toISOString(),
      actorId: payload.actorId ?? payload.actorUserId ?? null,
      count: payload.count,
    });
  }

  private requirementId(payload: DomainPayload): number {
    return Number(
      payload.requirementId ?? payload.schedulingRequirementId ?? 0,
    );
  }

  private scenarioId(payload: DomainPayload): number | null {
    const raw = payload.scheduleScenarioId ?? payload.scenarioId;
    return raw == null ? null : Number(raw);
  }

  private channel(tenantId: number): string {
    return `${PLANNER_EVENTS_REDIS_CHANNEL_PREFIX}${tenantId}${PLANNER_EVENTS_REDIS_CHANNEL_SUFFIX}`;
  }

  private async publish(payload: PlannerNotifyPayload): Promise<void> {
    if (!this.client || !payload.tenantId) return;
    try {
      await this.client.publish(
        this.channel(payload.tenantId),
        JSON.stringify(payload),
      );
    } catch (err) {
      this.logger.warn(
        `Planner events publish failed (fail-open): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
