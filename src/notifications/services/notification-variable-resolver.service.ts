import { Injectable } from '@nestjs/common';
import { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';
import { UserService } from '../../users/users.service';
import {
  normalizeNotificationContextSource,
  parseOptionalPositiveInt,
} from '../context/notification-context-source.util';
import {
  resolveNotificationEntityRef,
  type NotificationEntityHydrationRef,
} from '../context/notification-entity-ref.util';
import { ConfigObjectVariableProvider } from '../context/providers/config-object-variable.provider';
import {
  LEGACY_OBJECT_URL_FLAT_KEYS,
  LEGACY_SOR_ENTITY_FIELD_MAPS,
  LEGACY_SOR_RELATED_OBJECT_HYDRATIONS,
} from '../context/legacy-sor-field-maps.constants';
import { getNotificationUserDisplayName } from '../context/notification-user-display.util';
import { NotificationUrlBuilderService } from './notification-url-builder.service';

/**
 * Thin legacy flat-key shim for event-log template rendering (NV6.3).
 * Entity hydration delegates to {@link ConfigObjectVariableProvider} via
 * {@link resolveNotificationEntityRef} — no per-entity TypeORM resolvers.
 */
@Injectable()
export class NotificationVariableResolverService {
  constructor(
    private readonly userService: UserService,
    private readonly urlBuilder: NotificationUrlBuilderService,
    private readonly configObjectVariableProvider: ConfigObjectVariableProvider,
  ) {}

  /**
   * Builds a legacy flat variable map to supplement Handlebars context rendering.
   */
  async resolve(eventLog: EventLogEntity): Promise<Record<string, unknown>> {
    const variables: Record<string, unknown> = {
      ...(eventLog.payload && typeof eventLog.payload === 'object'
        ? eventLog.payload
        : {}),
    };

    this.setIfMissing(variables, 'eventName', eventLog.event?.name ?? null);
    this.setIfMissing(variables, 'eventId', eventLog.eventId);
    this.setIfMissing(variables, 'userId', eventLog.userId);
    this.setIfMissing(variables, 'entityId', eventLog.entityId ?? null);
    this.setIfMissing(variables, 'entityType', eventLog.entityType ?? null);
    this.setIfMissing(
      variables,
      'createdAt',
      eventLog.createdAt?.toISOString?.() ?? null,
    );

    await this.resolveActorAndRecipient(eventLog, variables);

    const buildInput = {
      source: { kind: 'event_log' as const, eventLog },
      recipientUserId: eventLog.userId,
      tenantId: parseOptionalPositiveInt(variables.tenantId),
    };
    const source = normalizeNotificationContextSource(buildInput);
    const entityRef = resolveNotificationEntityRef(buildInput, source);

    if (entityRef && source.tenantId) {
      await this.hydrateLegacyEntityVariables(
        entityRef,
        source.tenantId,
        variables,
      );
    }

    return variables;
  }

  private async hydrateLegacyEntityVariables(
    ref: NotificationEntityHydrationRef,
    tenantId: number,
    variables: Record<string, unknown>,
    visited: Set<string> = new Set(),
  ): Promise<void> {
    const visitKey = `${ref.objectType}:${ref.coreId ?? ref.instanceId ?? 'n/a'}`;
    if (visited.has(visitKey)) {
      return;
    }
    visited.add(visitKey);

    if (ref.resolutionMode === 'sor_bound' && ref.coreId) {
      const legacyFieldMap = LEGACY_SOR_ENTITY_FIELD_MAPS[ref.objectType];
      if (!legacyFieldMap) {
        return;
      }

      const hydrated =
        await this.configObjectVariableProvider.hydrateLegacyFlatVariables(
          variables,
          tenantId,
          ref.objectType,
          ref.coreId,
          legacyFieldMap,
        );

      if (!hydrated) {
        return;
      }

      this.setIfMissing(variables, 'tenantId', tenantId);
      this.applyLegacyObjectUrl(ref.objectType, ref.coreId, variables);
      await this.hydrateRelatedLegacyEntities(
        ref.objectType,
        tenantId,
        variables,
        visited,
      );
      return;
    }

    if (ref.resolutionMode === 'standalone' && ref.instanceId) {
      const fields = await this.configObjectVariableProvider.resolveEntityFields(
        tenantId,
        ref.objectType,
        undefined,
        ref.instanceId,
      );

      if (!fields) {
        return;
      }

      for (const [fieldKey, value] of Object.entries(fields)) {
        this.setIfMissing(variables, fieldKey, value);
      }
    }
  }

  private async hydrateRelatedLegacyEntities(
    sourceObjectType: string,
    tenantId: number,
    variables: Record<string, unknown>,
    visited: Set<string>,
  ): Promise<void> {
    for (const relation of LEGACY_SOR_RELATED_OBJECT_HYDRATIONS) {
      if (relation.sourceObjectType !== sourceObjectType) {
        continue;
      }

      const relatedCoreId = parseOptionalPositiveInt(
        variables[relation.idFieldKey],
      );
      if (
        !relatedCoreId ||
        !LEGACY_SOR_ENTITY_FIELD_MAPS[relation.relatedObjectType]
      ) {
        continue;
      }

      await this.hydrateLegacyEntityVariables(
        {
          entityType: relation.relatedObjectType,
          entityId: relatedCoreId,
          objectType: relation.relatedObjectType,
          resolutionMode: 'sor_bound',
          coreId: relatedCoreId,
        },
        tenantId,
        variables,
        visited,
      );
    }
  }

  private applyLegacyObjectUrl(
    objectType: string,
    coreId: number,
    variables: Record<string, unknown>,
  ): void {
    const flatKey = LEGACY_OBJECT_URL_FLAT_KEYS[objectType];
    if (!flatKey) {
      return;
    }

    const url = this.buildLegacyObjectUrl(objectType, coreId);
    if (url) {
      this.setIfMissing(variables, flatKey, url);
    }
  }

  private buildLegacyObjectUrl(
    objectType: string,
    coreId: number,
  ): string | null {
    switch (objectType) {
      case 'project':
        return this.urlBuilder.buildProjectUrl(coreId);
      case 'task':
        return this.urlBuilder.buildTaskUrl(coreId);
      default:
        return null;
    }
  }

  private async resolveActorAndRecipient(
    eventLog: EventLogEntity,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const actorId = eventLog.createdBy ?? eventLog.userId;
    const recipientId = eventLog.userId;

    const actor = await this.safeFindUser(actorId);
    if (actor) {
      this.setIfMissing(variables, 'actorId', actor.userId);
      this.setIfMissing(
        variables,
        'actorName',
        getNotificationUserDisplayName(actor),
      );
      this.setIfMissing(variables, 'actorEmail', actor.email);
    }

    const recipient = await this.safeFindUser(recipientId);
    if (recipient) {
      this.setIfMissing(variables, 'recipientId', recipient.userId);
      this.setIfMissing(
        variables,
        'recipientName',
        getNotificationUserDisplayName(recipient),
      );
      this.setIfMissing(variables, 'recipientEmail', recipient.email);
    }
  }

  private setIfMissing(
    variables: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (
      variables[key] === undefined ||
      variables[key] === null ||
      variables[key] === ''
    ) {
      variables[key] = value;
    }
  }

  private async safeFindUser(userId?: number): Promise<{
    userId: number;
    email?: string | null;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
  } | null> {
    if (!userId) {
      return null;
    }
    try {
      return await this.userService.findOne(userId, userId);
    } catch {
      return null;
    }
  }
}
