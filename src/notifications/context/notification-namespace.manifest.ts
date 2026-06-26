/**
 * Design-time catalog entries for the notification variable picker.
 * Runtime values are resolved into {@link NotificationContext} namespaces.
 */

export const NOTIFICATION_VARIABLE_GROUPS = [
  'Event',
  'Actor',
  'Recipient',
  'Tenant',
  'URLs',
  'Process',
  'Workflow',
  'Entity',
  'Payload',
] as const;

export type NotificationVariableGroup =
  (typeof NOTIFICATION_VARIABLE_GROUPS)[number];

export type NotificationVariableCatalogValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'date'
  | 'url'
  | 'unknown';

export interface NotificationVariableCatalogEntry {
  /** Stable catalog key (not necessarily equal to path). */
  key: string;
  /** Human label for template builder UI. */
  label: string;
  /** Handlebars dot-path, e.g. `entity.fields.companyName`. */
  path: string;
  type: NotificationVariableCatalogValueType;
  group: NotificationVariableGroup;
  description?: string;
  /** When true, children come from config object schema at catalog build time (NV5). */
  dynamic?: boolean;
}

/**
 * Built-in namespace manifest (static). Dynamic `entity.fields.*` merged in NV5.
 */
export const NOTIFICATION_NAMESPACE_MANIFEST: NotificationVariableCatalogEntry[] =
  [
    // Event
    {
      key: 'event.name',
      label: 'Event name',
      path: 'event.name',
      type: 'string',
      group: 'Event',
    },
    {
      key: 'event.occurredAt',
      label: 'Occurred at',
      path: 'event.occurredAt',
      type: 'date',
      group: 'Event',
    },
    {
      key: 'event.correlationId',
      label: 'Correlation ID',
      path: 'event.correlationId',
      type: 'string',
      group: 'Event',
    },
    // Actor
    {
      key: 'actor.name',
      label: 'Actor name',
      path: 'actor.name',
      type: 'string',
      group: 'Actor',
    },
    {
      key: 'actor.email',
      label: 'Actor email',
      path: 'actor.email',
      type: 'string',
      group: 'Actor',
    },
    // Recipient
    {
      key: 'recipient.name',
      label: 'Recipient name',
      path: 'recipient.name',
      type: 'string',
      group: 'Recipient',
    },
    {
      key: 'recipient.email',
      label: 'Recipient email',
      path: 'recipient.email',
      type: 'string',
      group: 'Recipient',
    },
    // Tenant
    {
      key: 'tenant.id',
      label: 'Tenant ID',
      path: 'tenant.id',
      type: 'number',
      group: 'Tenant',
    },
    {
      key: 'tenant.name',
      label: 'Tenant name',
      path: 'tenant.name',
      type: 'string',
      group: 'Tenant',
    },
    // URLs
    {
      key: 'urls.processRunner',
      label: 'Process runner URL',
      path: 'urls.processRunner',
      type: 'url',
      group: 'URLs',
    },
    {
      key: 'urls.project',
      label: 'Project URL',
      path: 'urls.project',
      type: 'url',
      group: 'URLs',
    },
    {
      key: 'urls.task',
      label: 'Task URL',
      path: 'urls.task',
      type: 'url',
      group: 'URLs',
    },
    {
      key: 'urls.objectInstance',
      label: 'Object instance URL',
      path: 'urls.objectInstance',
      type: 'url',
      group: 'URLs',
    },
    {
      key: 'urls.verification',
      label: 'Email verification URL',
      path: 'urls.verification',
      type: 'url',
      group: 'URLs',
      description:
        'Generic config-object verification link (e.g. /verify-customer?token=…)',
    },
    // Process
    {
      key: 'process.instanceId',
      label: 'Process instance ID',
      path: 'process.instanceId',
      type: 'number',
      group: 'Process',
    },
    {
      key: 'process.stepName',
      label: 'Step name',
      path: 'process.stepName',
      type: 'string',
      group: 'Process',
    },
    {
      key: 'process.runnerUrl',
      label: 'Runner URL (process)',
      path: 'process.runnerUrl',
      type: 'url',
      group: 'Process',
    },
    // Workflow
    {
      key: 'workflow.subjectType',
      label: 'Subject type',
      path: 'workflow.subjectType',
      type: 'string',
      group: 'Workflow',
    },
    {
      key: 'workflow.context',
      label: 'Workflow context (object)',
      path: 'workflow.context',
      type: 'object',
      group: 'Workflow',
      description: 'Use nested paths, e.g. workflow.context.customerId',
    },
    // Entity (static keys; fields are dynamic per objectType)
    {
      key: 'entity.objectType',
      label: 'Object type',
      path: 'entity.objectType',
      type: 'string',
      group: 'Entity',
    },
    {
      key: 'entity.displayLabel',
      label: 'Entity display label',
      path: 'entity.displayLabel',
      type: 'string',
      group: 'Entity',
    },
    {
      key: 'entity.fields',
      label: 'Entity fields',
      path: 'entity.fields',
      type: 'object',
      group: 'Entity',
      dynamic: true,
      description: 'Per-field paths from config object schema, e.g. entity.fields.companyName',
    },
    // Payload
    {
      key: 'payload',
      label: 'Event payload (object)',
      path: 'payload',
      type: 'object',
      group: 'Payload',
      description: 'Use nested paths, e.g. payload.projectId',
    },
  ];

/**
 * Manifest entries grouped for UI sections.
 */
export function groupNotificationVariableCatalog(
  entries: NotificationVariableCatalogEntry[] = NOTIFICATION_NAMESPACE_MANIFEST,
): Record<NotificationVariableGroup, NotificationVariableCatalogEntry[]> {
  const grouped = Object.fromEntries(
    NOTIFICATION_VARIABLE_GROUPS.map((g) => [g, []]),
  ) as unknown as Record<
    NotificationVariableGroup,
    NotificationVariableCatalogEntry[]
  >;

  for (const entry of entries) {
    grouped[entry.group].push(entry);
  }

  return grouped;
}
