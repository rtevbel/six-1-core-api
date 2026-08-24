import { Injectable, Logger } from '@nestjs/common';
import { applyJsonLogicRule } from '../../common/json-logic/json-logic-rule.util';
import { ProcessLifecycleFacade } from '../process-lifecycle.facade';
import { ProcessFeatureFlagsService } from '../config/process-feature-flags.service';
import { ProcessStartRulesService } from '../../process_start_rules/process_start_rules.service';
import type { ProcessStartRuleEntity } from '../../process_start_rules/entities/process_start_rule.entity';
import type { EventEnvelope } from '../../events/types';
import type { PlatformEventRecordEntity } from '../../events/platform-bus/entities/platform_event_record.entity';
import { EventCatalogService } from '../../events/event-catalog.service';
import {
  isDeprecatedNotificationEventName,
} from '../../events/constants/platform-event-names.constants';
import { resolveCorrelationId } from '../../events/platform-correlation.util';
import { buildResolvedProcessStartSubject } from './process-start-rule-subject-resolution.util';
import { ProcessStartRuleDedupService } from './process-start-rule-dedup.service';

export interface ProcessStartRuleExecutionResult {
  ruleId: number;
  status: 'started' | 'skipped' | 'failed';
  processInstanceId?: number;
  reason?: string;
}

/**
 * Loads and matches process start rules against platform events (D2).
 */
@Injectable()
export class ProcessStartRuleEngineService {
  private readonly logger = new Logger(ProcessStartRuleEngineService.name);

  constructor(
    private readonly rulesService: ProcessStartRulesService,
    private readonly lifecycle: ProcessLifecycleFacade,
    private readonly dedup: ProcessStartRuleDedupService,
    private readonly processFlags: ProcessFeatureFlagsService,
    private readonly catalog: EventCatalogService,
  ) {}

  isEnabled(): boolean {
    return this.processFlags.isEventStartRegistryEnabled();
  }

  canHandle(envelope: EventEnvelope): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    return envelope.eventName.startsWith('six1-event.');
  }

  async process(
    envelope: EventEnvelope,
    record: PlatformEventRecordEntity,
  ): Promise<ProcessStartRuleExecutionResult[]> {
    if (!this.canHandle(envelope)) {
      return [];
    }

    const eventName = isDeprecatedNotificationEventName(envelope.eventName)
      ? this.catalog.resolveCanonicalEventName(envelope.eventName)
      : envelope.eventName;

    const tenantId = this.resolveTenantId(envelope);
    if (tenantId == null) {
      this.logger.warn(
        `Skipping process start rules for ${eventName} — missing tenant scope`,
      );
      return [];
    }

    const rules = await this.rulesService.findActiveRulesForEvent(
      eventName,
      tenantId,
    );

    if (rules.length === 0) {
      this.logger.debug(
        `No process start rules for ${eventName} tenant=${tenantId}`,
      );
      return [];
    }

    const results: ProcessStartRuleExecutionResult[] = [];
    const correlationId = resolveCorrelationId(
      envelope.correlationId,
      `platform-event:${record.recordId}`,
    );

    for (const rule of rules) {
      results.push(
        await this.executeRule(rule, envelope, tenantId, correlationId),
      );
    }

    return results;
  }

  private async executeRule(
    rule: ProcessStartRuleEntity,
    envelope: EventEnvelope,
    tenantId: number,
    correlationId: string,
  ): Promise<ProcessStartRuleExecutionResult> {
    if (!this.matchesFilter(rule, envelope)) {
      return {
        ruleId: rule.ruleId,
        status: 'skipped',
        reason: 'filter_not_matched',
      };
    }

    try {
      const resolved = buildResolvedProcessStartSubject({
        subjectType: rule.subjectType,
        subjectIdSource: rule.subjectIdSource,
        contextPatch: rule.contextPatch,
        envelope,
      });

      const contextTenantId = this.resolveContextTenantId(resolved.context, envelope);

      const blocking = await this.dedup.findBlockingActiveProcess({
        tenantId,
        subjectType: resolved.subjectType,
        subjectId: resolved.subjectId,
        templateId: rule.templateId,
        correlationId,
        contextTenantId,
      });

      if (blocking) {
        this.logger.debug(
          `Rule ${rule.ruleId} skipped — active process ${blocking.processInstanceId} already exists`,
        );
        return {
          ruleId: rule.ruleId,
          status: 'skipped',
          processInstanceId: blocking.processInstanceId,
          reason: 'active_process_exists',
        };
      }

      const createdBy = envelope.createdBy ?? envelope.userId ?? 1;
      const startResult = await this.lifecycle.startProcess({
        tenantId,
        createdBy,
        templateId: rule.templateId,
        subjectType: resolved.subjectType,
        subjectId: resolved.subjectId,
        context: resolved.context,
        correlationId,
      });

      this.logger.debug(
        `Rule ${rule.ruleId} started process ${startResult.processInstanceId} for ${envelope.eventName}`,
      );

      return {
        ruleId: rule.ruleId,
        status: 'started',
        processInstanceId: startResult.processInstanceId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown start rule error';
      this.logger.error(
        `Process start rule ${rule.ruleId} failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        ruleId: rule.ruleId,
        status: 'failed',
        reason: message.slice(0, 2048),
      };
    }
  }

  private matchesFilter(
    rule: ProcessStartRuleEntity,
    envelope: EventEnvelope,
  ): boolean {
    if (!rule.filterJson || Object.keys(rule.filterJson).length === 0) {
      return true;
    }

    try {
      return applyJsonLogicRule(rule.filterJson, envelope);
    } catch (error) {
      this.logger.warn(
        `Invalid filter_json on process start rule ${rule.ruleId}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  private resolveTenantId(envelope: EventEnvelope): number | null {
    const raw = envelope.tenantId;
    const numeric = raw != null && raw !== '' ? Number(raw) : NaN;
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }

    const entity = envelope.entity as
      | { entityType?: string; entityId?: number | string }
      | undefined;
    if (entity?.entityType === 'tenant') {
      const tenantId = Number(entity.entityId);
      if (Number.isFinite(tenantId) && tenantId > 0) {
        return tenantId;
      }
    }

    return null;
  }

  private resolveContextTenantId(
    context: Record<string, unknown>,
    envelope: EventEnvelope,
  ): number | undefined {
    const fromContext = Number(context.tenantId);
    if (Number.isFinite(fromContext) && fromContext > 0) {
      return fromContext;
    }

    const entity = envelope.entity as
      | { entityType?: string; entityId?: number | string }
      | undefined;
    if (entity?.entityType === 'tenant' || entity?.entityType === 'tenants') {
      const tenantId = Number(entity.entityId);
      if (Number.isFinite(tenantId) && tenantId > 0) {
        return tenantId;
      }
    }

    return undefined;
  }
}
