import { Injectable } from '@nestjs/common';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { EventsService } from '../../events/events.service';
import type { EventPayloadSchema } from '../../events/interfaces/event-payload-schema.interface';
import {
  getPlatformEventCatalogSeedEntry,
  resolveCanonicalEventName,
} from '../../events/seed/platform-event-catalog.seed';
import {
  NOTIFICATION_NAMESPACE_MANIFEST,
  groupNotificationVariableCatalog,
  type NotificationVariableCatalogEntry,
  type NotificationVariableCatalogValueType,
} from '../context/notification-namespace.manifest';
import type { GetNotificationVariableCatalogDto } from './dto/get-notification-variable-catalog.dto';
import {
  buildEventPayloadCatalogEntries,
  buildPayloadSchemaCatalogEntries,
  normalizeCatalogEventName,
} from './notification-event-variable-catalog.util';
import type { NotificationVariableCatalogResult } from './interfaces/notification-variable-catalog-result.interface';

export interface CatalogBuildOptions {
  tenantId?: number | null;
  eventName?: string | null;
  objectType?: string | null;
  processTemplateId?: number | null;
}

function mapConfigFieldType(fieldType: string): NotificationVariableCatalogValueType {
  switch (fieldType) {
    case 'boolean':
    case 'checkbox':
      return 'boolean';
    case 'number':
    case 'integer':
    case 'decimal':
      return 'number';
    case 'date':
    case 'datetime':
      return 'date';
    default:
      return 'string';
  }
}

function dedupeCatalogEntries(
  entries: NotificationVariableCatalogEntry[],
): NotificationVariableCatalogEntry[] {
  const seen = new Set<string>();
  const out: NotificationVariableCatalogEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.path)) {
      continue;
    }
    seen.add(entry.path);
    out.push(entry);
  }
  return out;
}

@Injectable()
export class NotificationVariableCatalogService {
  constructor(
    private readonly configObjectsService: ConfigObjectsService,
    private readonly eventsService: EventsService,
  ) {}

  async getCatalog(
    dto: GetNotificationVariableCatalogDto,
  ): Promise<NotificationVariableCatalogResult> {
    return this.buildCatalog({
      tenantId: dto.tenantId,
      eventName: dto.eventName ?? null,
      objectType: dto.objectType ?? null,
      processTemplateId: dto.processTemplateId ?? null,
    });
  }

  async buildCatalog(
    options: CatalogBuildOptions,
  ): Promise<NotificationVariableCatalogResult> {
    const entries = dedupeCatalogEntries([
      ...NOTIFICATION_NAMESPACE_MANIFEST,
      ...(await this.buildEventPayloadEntries(options.eventName)),
      ...(await this.buildEntityFieldEntries(
        options.tenantId,
        options.objectType,
      )),
      ...this.buildProcessTemplateEntries(options.processTemplateId),
    ]);

    return {
      eventName: options.eventName ?? null,
      objectType: options.objectType ?? null,
      processTemplateId: options.processTemplateId ?? null,
      entries,
      grouped: groupNotificationVariableCatalog(entries),
    };
  }

  /**
   * Returns true when the event has catalog payload variables (schema or EventVars shim).
   */
  async isKnownEventName(eventName?: string | null): Promise<boolean> {
    const entries = await this.buildEventPayloadEntries(eventName);
    return entries.length > 0;
  }

  private async buildEventPayloadEntries(
    eventName?: string | null,
  ): Promise<NotificationVariableCatalogEntry[]> {
    if (!eventName?.trim()) {
      return [];
    }

    const payloadSchema = await this.resolveEventPayloadSchema(eventName);
    return buildEventPayloadCatalogEntries({ eventName, payloadSchema });
  }

  private async resolveEventPayloadSchema(
    eventName: string,
  ): Promise<EventPayloadSchema | null> {
    for (const candidate of this.buildEventNameCandidates(eventName)) {
      const event = await this.eventsService.findOptionalByName(candidate);
      if (event?.payloadSchema) {
        return event.payloadSchema;
      }
    }

    for (const candidate of this.buildEventNameCandidates(eventName)) {
      const seedSchema = getPlatformEventCatalogSeedEntry(candidate)?.payloadSchema;
      if (seedSchema && buildPayloadSchemaCatalogEntries(seedSchema).length > 0) {
        return seedSchema;
      }
    }

    return null;
  }

  private buildEventNameCandidates(eventName: string): string[] {
    const trimmed = eventName.trim();
    const canonical = resolveCanonicalEventName(trimmed);
    const normalized = normalizeCatalogEventName(trimmed);
    const prefixed = trimmed.startsWith('six1-event.')
      ? trimmed
      : `six1-event.${normalized}`;

    return [...new Set([trimmed, canonical, prefixed, normalized])];
  }

  private async buildEntityFieldEntries(
    tenantId?: number | null,
    objectType?: string | null,
  ): Promise<NotificationVariableCatalogEntry[]> {
    if (!objectType?.trim()) {
      return [];
    }

    const schema = await this.configObjectsService.getObjectSchema(
      tenantId,
      objectType,
    );
    if (!schema) {
      return [];
    }

    const fieldEntries = (schema.fieldRegistry ?? []).map((field) => ({
      key: `entity.fields.${field.fieldKey}`,
      label: field.label || field.fieldKey,
      path: `entity.fields.${field.fieldKey}`,
      type: mapConfigFieldType(field.fieldType),
      group: 'Entity' as const,
      dynamic: true,
      description: `Config object field (${objectType})`,
    }));

    return [...fieldEntries, ...this.buildEntityRelationEntries(schema, objectType)];
  }

  private buildEntityRelationEntries(
    schema: NonNullable<
      Awaited<ReturnType<ConfigObjectsService['getObjectSchema']>>
    >,
    objectType: string,
  ): NotificationVariableCatalogEntry[] {
    const entries: NotificationVariableCatalogEntry[] = [];

    for (const relation of schema.relations ?? []) {
      if (!relation.isActive) {
        continue;
      }

      entries.push({
        key: `entity.relations.${relation.relationshipKey}`,
        label: relation.displayName,
        path: `entity.relations.${relation.relationshipKey}.fields`,
        type: 'string',
        group: 'Entity',
        dynamic: true,
        description: `Related ${relation.toObjectType} (${relation.cardinality}) from ${objectType}`,
      });

      const relatedFields =
        schema.relatedFieldRegistryByRelationKey?.[relation.relationshipKey] ??
        [];
      for (const field of relatedFields) {
        entries.push({
          key: `entity.relations.${relation.relationshipKey}.fields.${field.fieldKey}`,
          label: `${relation.displayName} — ${field.label || field.fieldKey}`,
          path: `entity.relations.${relation.relationshipKey}.fields.${field.fieldKey}`,
          type: mapConfigFieldType(field.fieldType),
          group: 'Entity',
          dynamic: true,
          description: `Related field on ${relation.relationshipKey}`,
        });
      }
    }

    return entries;
  }

  private buildProcessTemplateEntries(
    processTemplateId?: number | null,
  ): NotificationVariableCatalogEntry[] {
    if (!processTemplateId) {
      return [];
    }

    return [
      {
        key: 'process.templateId',
        label: 'Process template ID',
        path: 'process.templateId',
        type: 'number',
        group: 'Process',
        description: `Process template context hint (#${processTemplateId})`,
      },
    ];
  }
}
