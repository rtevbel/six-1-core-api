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