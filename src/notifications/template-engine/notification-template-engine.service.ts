import { Injectable } from '@nestjs/common';
import type Handlebars from 'handlebars';
import type { EventEnvelope } from '../../events/types';
import type { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';
import { EventVars } from '../../common/event-variables';
import { NotificationContextBuilderService } from '../context/notification-context-builder.service';
import { getByPath } from '../context/notification-context-path.util';
import { parseOptionalPositiveInt } from '../context/notification-context-source.util';
import type { NotificationContext } from '../context/notification-context.types';
import { NotificationVariableResolverService } from '../services/notification-variable-resolver.service';
import { createNotificationHandlebarsRuntime } from './handlebars-helpers.registry';
import { buildHandlebarsRenderView } from './notification-legacy-context-shim.util';
import type { TemplateRenderResult } from './template-render-result.interface';
import { extractTemplatePathsFromMany } from './template-ast-path-extractor';

/**
 * Handlebars notification template engine with lazy context hydration (NV4).
 */
@Injectable()
export class NotificationTemplateEngineService {
  private readonly handlebars = createNotificationHandlebarsRuntime();
  private readonly compileCache = new Map<
    string,
    Handlebars.TemplateDelegate
  >();

  constructor(
    private readonly contextBuilder: NotificationContextBuilderService,
    private readonly variableResolver: NotificationVariableResolverService,
  ) {}

  /**
   * Renders subject and message templates against a built notification context.
   */
  render(
    eventName: string,
    subjectTemplate: string | null,
    messageTemplate: string,
    context: NotificationContext,
    legacyFlat?: Record<string, unknown>,
    referencedPaths?: string[],
  ): TemplateRenderResult {
    const paths =
      referencedPaths ??
      extractTemplatePathsFromMany([subjectTemplate, messageTemplate]);
    const view = buildHandlebarsRenderView(context, legacyFlat);
    const missingRequired = this.getMissingRequiredKeys(eventName, view);

    const subject = subjectTemplate
      ? this.compileAndRender(subjectTemplate, view)
      : null;
    const message = this.compileAndRender(messageTemplate, view);

    return { subject, message, missingRequired };
  }

  /**
   * Extracts template paths, hydrates context, and renders from an event log.
   */
  async renderFromEventLog(
    eventLog: EventLogEntity,
    subjectTemplate: string | null,
    messageTemplate: string,
  ): Promise<TemplateRenderResult> {
    const paths = extractTemplatePathsFromMany([
      subjectTemplate,
      messageTemplate,
    ]);
    const legacyFlat = await this.variableResolver.resolve(eventLog);
    const context = await this.contextBuilder.build(
      {
        source: {
          kind: 'event_log',
          eventLog,
          eventName: eventLog.event?.name,
        },
        recipientUserId: eventLog.userId,
        tenantId: this.resolveTenantId(eventLog, legacyFlat),
      },
      { requiredPaths: paths },
    );

    return this.render(
      eventLog.event?.name ?? '',
      subjectTemplate,
      messageTemplate,
      context,
      legacyFlat,
      paths,
    );
  }

  /**
   * Extracts template paths, hydrates context, and renders from an envelope.
   */
  async renderFromEnvelope(
    envelope: EventEnvelope,
    recipientUserId: number,
    subjectTemplate: string | null,
    messageTemplate: string,
  ): Promise<TemplateRenderResult> {
    const paths = extractTemplatePathsFromMany([
      subjectTemplate,
      messageTemplate,
    ]);
    const context = await this.contextBuilder.build(
      {
        source: { kind: 'envelope', envelope },
        recipientUserId,
        tenantId: parseOptionalPositiveInt(envelope.tenantId),
      },
      { requiredPaths: paths },
    );

    return this.render(
      envelope.eventName,
      subjectTemplate,
      messageTemplate,
      context,
      undefined,
      paths,
    );
  }

  private compileAndRender(
    template: string,
    view: Record<string, unknown>,
  ): string {
    let compiled = this.compileCache.get(template);
    if (!compiled) {
      compiled = this.handlebars.compile(template);
      this.compileCache.set(template, compiled);
    }
    return compiled(view);
  }

  private getMissingRequiredKeys(
    eventName: string,
    view: Record<string, unknown>,
  ): string[] {
    const required = EventVars?.[eventName as keyof typeof EventVars]?.required;
    if (!required?.length) {
      return [];
    }

    return required.filter((key) => !this.hasValue(key, view));
  }

  private hasValue(
    keyPath: string,
    view: Record<string, unknown>,
  ): boolean {
    const value = getByPath(view, keyPath);
    return value !== undefined && value !== null && value !== '';
  }

  private resolveTenantId(
    eventLog: EventLogEntity,
    legacyFlat: Record<string, unknown>,
  ): number | null {
    const payload = eventLog.payload ?? {};
    return (
      parseOptionalPositiveInt(payload.tenantId) ??
      parseOptionalPositiveInt(payload.tenant_id) ??
      parseOptionalPositiveInt(legacyFlat.tenantId)
    );
  }
}
