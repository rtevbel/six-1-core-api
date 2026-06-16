import type { EventEmitOptions } from './interfaces/event-emit-options.interface';
import { PLATFORM_EVENT_NAMES } from './constants/platform-event-names.constants';
import { buildPlatformEntityRef } from './platform-entity-ref.util';
import { resolveCorrelationId } from './platform-correlation.util';

export interface StandaloneConfigObjectInstanceEventContext {
  configCustomObjectInstanceId: number;
  configObjectId: number;
  objectType: string;
  tenantId: number;
  actorUserId?: number;
  status?: string;
  changedFields?: string[];
  correlationId?: string;
}

export interface SorBoundInstanceEventContext {
  objectType: string;
  coreId: number;
  tenantId: number;
  changedFields: string[];
  correlationId?: string;
  actorUserId?: number;
}

export function resolveTenantIdFromSorCore(
  core: Record<string, unknown>,
): number | undefined {
  const tenantId = core.tenantId ?? core.tenant_id;
  const parsed = Number(tenantId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function buildStandaloneConfigObjectInstanceCreatedOptions(
  ctx: StandaloneConfigObjectInstanceEventContext,
): EventEmitOptions {
  return buildStandaloneConfigObjectInstanceEventOptions(
    PLATFORM_EVENT_NAMES.CONFIG_OBJECT_INSTANCE_CREATED,
    ctx,
  );
}

export function buildStandaloneConfigObjectInstanceUpdatedOptions(
  ctx: StandaloneConfigObjectInstanceEventContext,
): EventEmitOptions {
  return buildStandaloneConfigObjectInstanceEventOptions(
    PLATFORM_EVENT_NAMES.CONFIG_OBJECT_INSTANCE_UPDATED,
    ctx,
  );
}

export function buildStandaloneConfigObjectInstanceDeletedOptions(
  ctx: StandaloneConfigObjectInstanceEventContext,
): EventEmitOptions {
  return buildStandaloneConfigObjectInstanceEventOptions(
    PLATFORM_EVENT_NAMES.CONFIG_OBJECT_INSTANCE_DELETED,
    ctx,
  );
}

function buildStandaloneConfigObjectInstanceEventOptions(
  _eventName: string,
  ctx: StandaloneConfigObjectInstanceEventContext,
): EventEmitOptions {
  const data: Record<string, unknown> = {
    configCustomObjectInstanceId: ctx.configCustomObjectInstanceId,
    configObjectId: ctx.configObjectId,
    objectType: ctx.objectType,
    tenantId: ctx.tenantId,
    resolutionMode: 'standalone',
  };

  if (ctx.status) {
    data.status = ctx.status;
  }
  if (ctx.actorUserId != null) {
    data.updatedBy = ctx.actorUserId;
    data.createdBy = ctx.actorUserId;
  }
  if (ctx.changedFields?.length) {
    data.changedFields = ctx.changedFields;
  }

  return {
    tenantId: ctx.tenantId,
    correlationId: resolveCorrelationId(ctx.correlationId),
    userId: ctx.actorUserId,
    createdBy: ctx.actorUserId,
    entity: buildPlatformEntityRef({
      entityType: 'config_custom_object_instance',
      entityId: ctx.configCustomObjectInstanceId,
      objectType: ctx.objectType,
      resolutionMode: 'standalone',
      instanceId: ctx.configCustomObjectInstanceId,
    }),
    data,
  };
}

export function buildSorBoundInstanceUpdatedEventOptions(
  ctx: SorBoundInstanceEventContext,
): EventEmitOptions {
  return {
    tenantId: ctx.tenantId,
    correlationId: resolveCorrelationId(ctx.correlationId),
    userId: ctx.actorUserId,
    createdBy: ctx.actorUserId,
    entity: buildPlatformEntityRef({
      entityType: ctx.objectType,
      entityId: ctx.coreId,
      objectType: ctx.objectType,
      resolutionMode: 'sor_bound',
      coreId: ctx.coreId,
    }),
    data: {
      objectType: ctx.objectType,
      resolutionMode: 'sor_bound',
      coreId: ctx.coreId,
      tenantId: ctx.tenantId,
      changedFields: ctx.changedFields,
      ...(ctx.actorUserId != null ? { updatedBy: ctx.actorUserId } : {}),
    },
  };
}

export interface SystemEntityUpdatedEventContext {
  objectType: string;
  entityId: number;
  tenantId?: number;
  changedFields: string[];
  correlationId?: string;
  actorUserId?: number;
}

export function buildSystemEntityUpdatedEventOptions(
  ctx: SystemEntityUpdatedEventContext,
): EventEmitOptions {
  const data: Record<string, unknown> = {
    objectType: ctx.objectType,
    resolutionMode: 'system_table',
    entityId: ctx.entityId,
    coreId: ctx.entityId,
    changedFields: ctx.changedFields,
  };

  if (ctx.tenantId != null) {
    data.tenantId = ctx.tenantId;
  }
  if (ctx.actorUserId != null) {
    data.updatedBy = ctx.actorUserId;
  }

  return {
    tenantId: ctx.tenantId,
    correlationId: resolveCorrelationId(ctx.correlationId),
    userId: ctx.actorUserId,
    createdBy: ctx.actorUserId,
    entity: buildPlatformEntityRef({
      entityType: ctx.objectType,
      entityId: ctx.entityId,
      objectType: ctx.objectType,
      resolutionMode: 'system_table',
      coreId: ctx.entityId,
    }),
    data,
  };
}
