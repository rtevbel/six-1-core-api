import { Injectable, Logger } from '@nestjs/common';
import { ConfigObjectsService } from '../../../config_objects/config_objects.service';
import type {
  NotificationBuildInput,
  NotificationBuildOptions,
  NotificationContext,
} from '../notification-context.types';
import type { NormalizedNotificationContextSource } from '../notification-context-source.util';
import { shouldHydrateEntityNamespace } from '../notification-context-hydration.util';
import {
  buildEntityFieldsFromResolvedInstance,
  resolveEntityDisplayLabel,
} from '../notification-entity-fields.util';
import { hydrateEntityRelations } from '../notification-entity-relation-hydrator.util';
import { resolveNotificationEntityRef } from '../notification-entity-ref.util';
import { applyFieldMapToLegacyVariables } from '../../services/notification-legacy-entity-fields.util';

/**
 * Hydrates `entity.*` from config object resolution (NV2).
 */
@Injectable()
export class ConfigObjectVariableProvider {
  private readonly logger = new Logger(ConfigObjectVariableProvider.name);

  constructor(private readonly configObjectsService: ConfigObjectsService) {}

  async apply(
    context: NotificationContext,
    source: NormalizedNotificationContextSource,
    input: NotificationBuildInput,
    options: NotificationBuildOptions = {},
  ): Promise<void> {
    if (!shouldHydrateEntityNamespace(options.requiredPaths)) {
      return;
    }

    const ref = resolveNotificationEntityRef(input, source);
    if (!ref || !source.tenantId) {
      return;
    }

    context.entity.type = ref.entityType ?? ref.objectType;
    context.entity.objectType = ref.objectType;
    context.entity.resolutionMode = ref.resolutionMode;
    context.entity.coreId = ref.coreId ?? null;
    context.entity.instanceId = ref.instanceId ?? null;

    try {
      const resolved = await this.configObjectsService.resolveObjectInstance(
        source.tenantId,
        ref.objectType,
        ref.coreId,
        ref.instanceId,
      );

      if (!resolved) {
        return;
      }

      const fields = buildEntityFieldsFromResolvedInstance(resolved);
      context.entity.fields = fields;
      context.entity.displayLabel = resolveEntityDisplayLabel(fields);

      if (resolved.resolutionMode === 'sor_bound') {
        context.entity.coreId = resolved.coreId;
      } else {
        context.entity.instanceId = resolved.instanceId;
      }

      await hydrateEntityRelations(
        this.configObjectsService,
        context,
        source.tenantId,
        ref.objectType,
        resolved,
        options.requiredPaths,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to hydrate entity context for objectType=${ref.objectType}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Resolves flat `entity.fields` for a sor_bound / standalone instance (shared with legacy resolver).
   */
  async resolveEntityFields(
    tenantId: number,
    objectType: string,
    coreId?: number,
    instanceId?: number,
  ): Promise<Record<string, unknown> | null> {
    try {
      const resolved = await this.configObjectsService.resolveObjectInstance(
        tenantId,
        objectType,
        coreId,
        instanceId,
      );
      if (!resolved) {
        return null;
      }
      return buildEntityFieldsFromResolvedInstance(resolved);
    } catch (error) {
      this.logger.warn(
        `Failed to resolve entity fields for objectType=${objectType}`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * Hydrates legacy flat template keys from config object resolution (NV6.3).
   */
  async hydrateLegacyFlatVariables(
    variables: Record<string, unknown>,
    tenantId: number,
    objectType: string,
    coreId: number,
    legacyFieldMap: Record<string, string>,
  ): Promise<boolean> {
    const fields = await this.resolveEntityFields(tenantId, objectType, coreId);
    if (!fields) {
      return false;
    }

    applyFieldMapToLegacyVariables(variables, fields, legacyFieldMap);
    return true;
  }
}
