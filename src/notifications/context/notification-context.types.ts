import type {
  EventEnvelope,
  EventEnvelopeRefs,
  PlatformEntityRef,
  PlatformEntityResolutionMode,
} from '../../events/types';
import type { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';

/** @see PlatformEntityResolutionMode */
export type NotificationEntityResolutionMode = PlatformEntityResolutionMode;

/**
 * Entity reference on the event envelope — IDs for hydration, not display fields.
 * @see docs/platform-event-envelope.md
 */
export interface NotificationEntityRef extends PlatformEntityRef {
  entityType: string;
  entityId: number | string;
}

/** Optional cross-refs for multi-entity template hydration (NV3+). */
export type NotificationEntityRefs = EventEnvelopeRefs;

export interface NotificationEventNamespace {
  name: string | null;
  occurredAt: string | null;
  correlationId: string | null;
  causationId: string | null;
}

export interface NotificationTenantNamespace {
  id: number | null;
  name: string | null;
}

export interface NotificationActorNamespace {
  id: number | null;
  name: string | null;
  email: string | null;
}

export interface NotificationRecipientNamespace {
  id: number | null;
  name: string | null;
  email: string | null;
}

export interface NotificationProcessNamespace {
  instanceId: number | null;
  templateId: number | null;
  stepInstanceId: number | null;
  stepName: string | null;
  stepOrder: number | null;
  status: string | null;
  runnerUrl: string | null;
}

export interface NotificationWorkflowNamespace {
  subjectType: string | null;
  subjectId: number | null;
  /** Merged process / start context JSON. */
  context: Record<string, unknown>;
}

export interface NotificationEntityNamespace {
  type: string | null;
  objectType: string | null;
  resolutionMode: NotificationEntityResolutionMode | null;
  coreId: number | null;
  instanceId: number | null;
  displayLabel: string | null;
  fields: Record<string, unknown>;
  relations: Record<string, NotificationEntityRelationNamespace>;
}

export interface NotificationEntityRelationNamespace {
  objectType: string | null;
  coreId: number | null;
  instanceId: number | null;
  fields: Record<string, unknown>;
}

export interface NotificationUrlsNamespace {
  processRunner: string | null;
  project: string | null;
  task: string | null;
  objectInstance: string | null;
  verification: string | null;
  [key: string]: string | null | undefined;
}

/**
 * Runtime context document for Handlebars notification templates.
 * Stable namespace contract — @see docs/events-and-notifications-revision.md §4.3
 */
export interface NotificationContext {
  event: NotificationEventNamespace;
  tenant: NotificationTenantNamespace;
  actor: NotificationActorNamespace;
  recipient: NotificationRecipientNamespace;
  process: NotificationProcessNamespace;
  workflow: NotificationWorkflowNamespace;
  entity: NotificationEntityNamespace;
  payload: Record<string, unknown>;
  urls: NotificationUrlsNamespace;
}

export type NotificationContextSource =
  | { kind: 'envelope'; envelope: EventEnvelope }
  | { kind: 'event_log'; eventLog: EventLogEntity; eventName?: string };

export interface NotificationBuildInput {
  source: NotificationContextSource;
  recipientUserId: number;
  tenantId?: number | null;
  entityRef?: NotificationEntityRef | null;
  refs?: NotificationEntityRefs | null;
}

export interface NotificationBuildOptions {
  /** Dot-paths referenced by templates — enables lazy hydration (NV2+). */
  requiredPaths?: string[];
}

/** Empty context tree; providers merge into this shape. */
export function createEmptyNotificationContext(): NotificationContext {
  return {
    event: {
      name: null,
      occurredAt: null,
      correlationId: null,
      causationId: null,
    },
    tenant: { id: null, name: null },
    actor: { id: null, name: null, email: null },
    recipient: { id: null, name: null, email: null },
    process: {
      instanceId: null,
      templateId: null,
      stepInstanceId: null,
      stepName: null,
      stepOrder: null,
      status: null,
      runnerUrl: null,
    },
    workflow: {
      subjectType: null,
      subjectId: null,
      context: {},
    },
    entity: {
      type: null,
      objectType: null,
      resolutionMode: null,
      coreId: null,
      instanceId: null,
      displayLabel: null,
      fields: {},
      relations: {},
    },
    payload: {},
    urls: {
      processRunner: null,
      project: null,
      task: null,
      objectInstance: null,
      verification: null,
    },
  };
}
