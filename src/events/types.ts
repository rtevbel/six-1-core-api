/**
 * Platform event envelope contract (P0.3).
 * @see docs/platform-event-envelope.md
 */

/** Config object binding mode for entity hydration on the envelope. */
export type PlatformEntityResolutionMode =
  | 'standalone'
  | 'sor_bound'
  | 'system_table';

/**
 * Entity reference on the event envelope — IDs and binding hints only.
 * Display fields are hydrated by consumers (e.g. NotificationContextBuilder).
 */
export interface PlatformEntityRef {
  entityType: string | null;
  entityId: number | string | null;
  objectType?: string;
  resolutionMode?: PlatformEntityResolutionMode;
  coreId?: number;
  instanceId?: number;
}

/** @deprecated Use {@link PlatformEntityRef}. */
export type EntityRef = PlatformEntityRef;

/** Optional cross-refs for process and related entity hydration. */
export interface EventEnvelopeRefs {
  processInstanceId?: number;
  stepInstanceId?: number;
  customerCoreId?: number;
  configObjectInstanceId?: number;
}

/**
 * Canonical domain event envelope emitted via {@link EventsService}.
 *
 * @template TData - Business payload shape (`data` namespace at render time).
 */
export type EventEnvelope<TData = unknown> = {
  /** Canonical name, e.g. `six1-event.process_step_ready`. */
  eventName: string;
  userId?: number;
  createdBy?: number;
  entity?: PlatformEntityRef | object;
  refs?: EventEnvelopeRefs;
  data?: TData;
  correlationId?: string;
  causationId?: string;
  externalId?: string;
  tenantId?: number | string;
  occurredAt?: Date;
};

export {
  buildEventEnvelope,
  buildPlatformEntityRef,
  buildSorBoundPlatformEntityRef,
  buildSystemTablePlatformEntityRef,
  normalizeEntityRef,
  normalizeEventEnvelopeRefs,
} from './platform-entity-ref.util';

export {
  PLATFORM_SOR_OBJECT_TYPES,
  PLATFORM_SYSTEM_TABLE_OBJECT_TYPES,
  buildSorBoundDomainEventOptions,
  buildSystemTableDomainEventOptions,
} from './platform-domain-event.util';

export { PLATFORM_EVENT_NAMES } from './constants/platform-event-names.constants';
