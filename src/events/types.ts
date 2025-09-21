/**
 * Represents a reference to an entity, including its type and ID.
 */
export type EntityRef = {
  /** The type of the entity (e.g., class name or entity name). */
  entityType: string | null;

  /** The unique identifier of the entity. */
  entityId: number | string | null;
};

/**
 * Represents the structure of an event envelope, which encapsulates
 * metadata and payload for a domain event.
 *
 * @template TData - The type of the event's payload data.
 */
export type EventEnvelope<TData = unknown> = {
  /**
   * The canonical name of the event, e.g., "six1-event.order.created".
   * This is used to uniquely identify the event type.
   */
  eventName: string;

  /** The ID of the user who triggered the event. */
  userId?: number;

  /**
   * The ID of the user who created the record in the system.
   * Defaults to the same value as `userId` if not explicitly provided.
   */
  createdBy?: number;

  /**
   * A reference to the primary entity associated with the event.
   * This can be an `EntityRef` or a raw entity object, which will be normalized.
   */
  entity?: EntityRef | object;

  /**
   * The business payload associated with the event.
   * This should be small and contain only the necessary data.
   */
  data?: TData;

  /** An optional correlation ID for cross-service tracing. */
  correlationId?: string;

  /** An optional causation ID to indicate the cause of this event. */
  causationId?: string;

  /**
   * An optional external identifier for the event, such as a notification ID
   * or a provider-specific key.
   */
  externalId?: string;

  /** The tenant ID for multi-tenant support. */
  tenantId?: number | string;

  /** The timestamp indicating when the event occurred. */
  occurredAt?: Date;
};

/**
 * Normalizes an entity reference to ensure it conforms to the EntityRef structure.
 *
 * @param input - The entity to normalize, which can be:
 *   - A TypeORM entity
 *   - A plain object with an `id` property
 *   - An EntityRef object
 * @returns An EntityRef object or undefined if the input is invalid.
 */
export function normalizeEntityRef(input?: any): { entityType: string | null; entityId: number | string | null } | undefined {
  if (!input) return undefined;

  if (typeof input === 'object' && 'entityId' in input && 'entityType' in input) {
    return input as any;
  }

  // If a constructor slipped in, we can only return the type
  if (typeof input === 'function') {
    return { entityType: input.name ?? null, entityId: null };
  }

  const direct =
    input?.projectId ??
    input?.id ??
    input?._id ??
    input?.entityId ??
    null;

  if (direct != null) {
    return { entityType: input?.constructor?.name ?? null, entityId: direct };
  }

  // Try instance or prototype getId()
  if (typeof input?.getId === 'function') {
    const v = input.getId();
    if (v != null) return { entityType: input?.constructor?.name ?? null, entityId: v };
  }
  const proto = Object.getPrototypeOf(input);
  if (proto && typeof proto.getId === 'function') {
    const v = proto.getId.call(input);
    if (v != null) return { entityType: input?.constructor?.name ?? null, entityId: v };
  }

  // Fallback
  return { entityType: input?.constructor?.name ?? null, entityId: null };
}
