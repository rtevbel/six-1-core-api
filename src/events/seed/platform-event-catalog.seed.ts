import { EventVars } from '../../common/event-variables';
import { normalizeCatalogEventName } from '../../notifications/catalog/notification-event-variable-catalog.util';
import {
  DEFAULT_EVENT_SCHEMA_VERSION,
  type EventCatalogCategory,
} from '../constants/event-catalog.constants';
import {
  PLATFORM_EVENT_NAMES,
  isDeprecatedNotificationEventName,
  resolveDeprecatedNotificationEventName,
} from '../constants/platform-event-names.constants';
import type { EventPayloadSchema } from '../interfaces/event-payload-schema.interface';
import {
  buildPayloadSchemaFromEventVarKeys,
  CONFIG_OBJECT_INSTANCE_PAYLOAD_SCHEMA,
  PROCESS_INSTANCE_PAYLOAD_SCHEMA,
  PROCESS_STEP_PAYLOAD_SCHEMA,
  SOR_BOUND_INSTANCE_PAYLOAD_SCHEMA,
  SYSTEM_ENTITY_UPDATED_PAYLOAD_SCHEMA,
} from './platform-event-payload-schema.util';

export interface PlatformEventCatalogSeedEntry {
  name: string;
  description: string;
  category: EventCatalogCategory;
  schemaVersion?: string;
  payloadSchema?: EventPayloadSchema;
  isSystem: boolean;
  /** Deprecated shim event — prefer {@link canonicalName}. */
  deprecated?: boolean;
  canonicalName?: string;
}

function fromEventVars(
  name: string,
  description: string,
  category: EventCatalogCategory,
  payloadSchema?: EventPayloadSchema,
): PlatformEventCatalogSeedEntry {
  const normalized = normalizeCatalogEventName(name);
  const spec = EventVars[normalized as keyof typeof EventVars];
  const schema =
    payloadSchema ??
    (spec
      ? buildPayloadSchemaFromEventVarKeys(
          spec.required ? [...spec.required] : [],
          spec.optional ? [...spec.optional] : [],
        )
      : undefined);

  return {
    name,
    description,
    category,
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: schema,
    isSystem: true,
  };
}

function deprecatedNotificationShim(
  name: string,
  canonicalName: string,
  description: string,
): PlatformEventCatalogSeedEntry {
  const normalized = normalizeCatalogEventName(name);
  const spec = EventVars[normalized as keyof typeof EventVars];
  const canonical = PLATFORM_EVENT_CATALOG_BY_NAME.get(canonicalName);

  return {
    name,
    description,
    category: canonical?.category ?? 'domain',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: spec
      ? buildPayloadSchemaFromEventVarKeys(
          spec.required ? [...spec.required] : [],
          spec.optional ? [...spec.optional] : [],
        )
      : canonical?.payloadSchema,
    isSystem: true,
    deprecated: true,
    canonicalName,
  };
}

const CANONICAL_PLATFORM_EVENT_CATALOG: PlatformEventCatalogSeedEntry[] = [
  /* ========= PROCESS LIFECYCLE ========= */
  {
    name: 'six1-event.process_started',
    description: 'A process instance was started.',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: PROCESS_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.process_step_ready',
    description: 'A process step is ready for user or system action.',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: PROCESS_STEP_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.process_step_started',
    description: 'A process step execution has started.',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: PROCESS_STEP_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.process_step_completed',
    description: 'A process step completed (automated or manual).',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: PROCESS_STEP_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.process_completed',
    description: 'A process instance reached a terminal completed state.',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: PROCESS_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.process_child_started',
    description: 'A child process was spawned from a parent step.',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: PROCESS_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.process_child_completed',
    description: 'A child process completed successfully.',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: PROCESS_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.process_child_canceled',
    description: 'A child process was canceled.',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: PROCESS_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.process_step_task_created',
    description: 'A task was created for a process step.',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: PROCESS_STEP_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.process_step_object_created',
    description: 'A config object instance was created by a process step.',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: CONFIG_OBJECT_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.process_step_object_validated',
    description: 'A config object instance passed step validation.',
    category: 'process',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: CONFIG_OBJECT_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },

  /* ========= REQUIREMENTS ========= */
  {
    name: 'six1-event.requirement.process_requirement_submitted',
    description: 'A process step requirement was submitted for review.',
    category: 'requirement',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: {
      type: 'object',
      properties: {
        processInstanceId: { type: 'number' },
        stepInstanceId: { type: 'number' },
        requirementId: { type: 'number' },
        submissionId: { type: 'number' },
      },
    },
    isSystem: true,
  },
  {
    name: 'six1-event.requirement.process_requirement_approved',
    description: 'A process step requirement submission was approved.',
    category: 'requirement',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: {
      type: 'object',
      properties: {
        processInstanceId: { type: 'number' },
        stepInstanceId: { type: 'number' },
        requirementId: { type: 'number' },
        submissionId: { type: 'number' },
        approvedBy: { type: 'number' },
      },
    },
    isSystem: true,
  },

  /* ========= DOMAIN / ENTITY ========= */
  {
    name: 'six1-event.config_object_instance.updated',
    description: 'A standalone config object instance was updated.',
    category: 'domain',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: CONFIG_OBJECT_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.config_object_instance.created',
    description: 'A standalone config object instance was created.',
    category: 'domain',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: CONFIG_OBJECT_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.config_object_instance.deleted',
    description: 'A standalone config object instance was deleted.',
    category: 'domain',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: CONFIG_OBJECT_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.sor_bound_instance.updated',
    description: 'A SOR-bound config object instance was updated.',
    category: 'domain',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: SOR_BOUND_INSTANCE_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  {
    name: 'six1-event.system_entity.updated',
    description: 'A system-table entity was updated via domain REST/RPC.',
    category: 'domain',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: SYSTEM_ENTITY_UPDATED_PAYLOAD_SCHEMA,
    isSystem: true,
  },
  fromEventVars(
    'six1-event.project_created',
    'A project was created.',
    'domain',
    buildPayloadSchemaFromEventVarKeys(
      [...EventVars.project_created.required],
      [...EventVars.project_created.optional],
    ),
  ),
  fromEventVars(
    'six1-event.project_status_changed',
    'A project status changed.',
    'domain',
    buildPayloadSchemaFromEventVarKeys(
      [...EventVars.project_status_changed.required],
      [...EventVars.project_status_changed.optional],
    ),
  ),
  fromEventVars(
    'six1-event.task_status_changed',
    'A task status changed.',
    'domain',
    buildPayloadSchemaFromEventVarKeys(
      [...EventVars.task_status_changed.required],
      [...EventVars.task_status_changed.optional],
    ),
  ),
  {
    name: 'six1-event.tenant.created',
    description: 'A tenant was created.',
    category: 'domain',
    schemaVersion: DEFAULT_EVENT_SCHEMA_VERSION,
    payloadSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'number' },
        tenantName: { type: 'string' },
      },
    },
    isSystem: true,
  },

  /* ========= LEGACY NOTIFICATION EVENT NAMES (pre-canonical) ========= */
  fromEventVars('tenant_email_verification', 'Tenant email verification requested.', 'domain'),
  fromEventVars('tenant_email_verified', 'Tenant email was verified.', 'domain'),
  fromEventVars('tenant_user_invited', 'A user was invited to a tenant.', 'domain'),
];

const PLATFORM_EVENT_CATALOG_BY_NAME = new Map(
  CANONICAL_PLATFORM_EVENT_CATALOG.map((entry) => [entry.name, entry]),
);

/** Deprecated `six1-event.notification.*` shims mapped to canonical events. */
const DEPRECATED_NOTIFICATION_SHIMS: PlatformEventCatalogSeedEntry[] = [
  deprecatedNotificationShim(
    'six1-event.notification.project_created',
    PLATFORM_EVENT_NAMES.PROJECT_CREATED,
    'Deprecated — use six1-event.project_created',
  ),
  deprecatedNotificationShim(
    'six1-event.notification.project_status_changed',
    PLATFORM_EVENT_NAMES.PROJECT_STATUS_CHANGED,
    'Deprecated — use six1-event.project_status_changed',
  ),
  deprecatedNotificationShim(
    'six1-event.notification.task_status_changed',
    PLATFORM_EVENT_NAMES.TASK_STATUS_CHANGED,
    'Deprecated — use six1-event.task_status_changed',
  ),
  deprecatedNotificationShim(
    'six1-event.notification.process_step_completed',
    PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED,
    'Deprecated — use six1-event.process_step_completed',
  ),
];

/**
 * Platform event catalog seed (P0.2).
 * Single source of truth for migration upserts and runtime auto-registration.
 * @see docs/platform-event-catalog.md
 */
export const PLATFORM_EVENT_CATALOG_SEED: PlatformEventCatalogSeedEntry[] = [
  ...CANONICAL_PLATFORM_EVENT_CATALOG,
  ...DEPRECATED_NOTIFICATION_SHIMS,
];

export function getPlatformEventCatalogSeedEntry(
  eventName: string,
): PlatformEventCatalogSeedEntry | undefined {
  return PLATFORM_EVENT_CATALOG_SEED.find((entry) => entry.name === eventName);
}

export function resolveCanonicalEventName(eventName: string): string {
  const entry = getPlatformEventCatalogSeedEntry(eventName);
  if (entry?.deprecated && entry.canonicalName) {
    return entry.canonicalName;
  }
  if (isDeprecatedNotificationEventName(eventName)) {
    return resolveDeprecatedNotificationEventName(eventName);
  }
  return eventName;
}

export function isDeprecatedPlatformEventName(eventName: string): boolean {
  return getPlatformEventCatalogSeedEntry(eventName)?.deprecated === true;
}
