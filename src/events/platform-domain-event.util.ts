import type { EventEmitOptions } from './interfaces/event-emit-options.interface';
import type { PlatformEntityResolutionMode } from './types';
import { resolveCorrelationId } from './platform-correlation.util';
import {
  buildSorBoundPlatformEntityRef,
  buildSystemTablePlatformEntityRef,
} from './platform-entity-ref.util';

export const PLATFORM_SOR_OBJECT_TYPES = {
  PROJECT: 'project',
  TASK: 'task',
} as const;

export const PLATFORM_SYSTEM_TABLE_OBJECT_TYPES = {
  PROCESS_INSTANCE: 'process_instances',
  PROCESS_INSTANCE_STEP: 'process_instance_steps',
} as const;

export function appendDomainBindingHints(
  data: Record<string, unknown>,
  objectType: string,
  resolutionMode: PlatformEntityResolutionMode,
  coreId: number,
): Record<string, unknown> {
  return {
    ...data,
    objectType,
    resolutionMode,
    coreId,
  };
}

export function buildSorBoundDomainEventOptions(params: {
  objectType: string;
  coreId: number;
  tenantId?: number;
  actorUserId?: number;
  correlationId?: string;
  data?: Record<string, unknown>;
}): EventEmitOptions {
  return {
    tenantId: params.tenantId,
    correlationId: resolveCorrelationId(params.correlationId),
    userId: params.actorUserId,
    createdBy: params.actorUserId,
    entity: buildSorBoundPlatformEntityRef(params.objectType, params.coreId),
    data: appendDomainBindingHints(
      params.data ?? {},
      params.objectType,
      'sor_bound',
      params.coreId,
    ),
  };
}

export function buildSystemTableDomainEventOptions(params: {
  objectType: string;
  entityId: number;
  tenantId?: number;
  actorUserId?: number;
  correlationId?: string;
  data?: Record<string, unknown>;
  refs?: EventEmitOptions['refs'];
}): EventEmitOptions {
  return {
    tenantId: params.tenantId,
    correlationId: resolveCorrelationId(params.correlationId),
    userId: params.actorUserId,
    createdBy: params.actorUserId,
    entity: buildSystemTablePlatformEntityRef(params.objectType, params.entityId),
    refs: params.refs,
    data: appendDomainBindingHints(
      params.data ?? {},
      params.objectType,
      'system_table',
      params.entityId,
    ),
  };
}
