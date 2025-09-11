// src/events/domain-events.service.ts

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEnvelope, EntityRef } from './types';

/**
 * Service for handling and emitting domain events.
 * This service uses the EventEmitter2 library to emit events
 * with additional metadata encapsulated in an EventEnvelope.
 */
@Injectable()
export class DomainEventsService {
  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Emits a domain event with the specified name and options.
   *
   * @param eventName - The name of the event to emit.
   * @param opts - Additional options for the event, including:
   *   - entity: The entity associated with the event (can be an object or EntityRef).
   *   - userId: The ID of the user responsible for the event.
   *   - createdBy: The ID of the user who created the event (defaults to userId if not provided).
   *   - data: The payload or data associated with the event.
   *   - correlationId: An ID to correlate this event with other events.
   *   - causationId: An ID to indicate the cause of this event.
   *   - externalId: An external identifier for the event.
   *   - tenantId: The tenant ID associated with the event.
   *   - occurredAt: The timestamp when the event occurred (defaults to the current date/time).
   */
  emit<TData = unknown>(
    eventName: string,
    opts: {
      entity?: object | EntityRef;
      userId?: number;
      createdBy?: number;
      data?: TData;
      correlationId?: string;
      causationId?: string;
      externalId?: string;
      tenantId?: number | string;
      occurredAt?: Date;
    } = {},
  ): void {
    // Create an EventEnvelope object with the provided options and defaults
    const envelope: EventEnvelope<TData> = {
      eventName,
      userId: opts.userId,
      createdBy: opts.createdBy ?? opts.userId,
      entity: normalizeEntityRef(opts.entity),
      data: opts.data,
      correlationId: opts.correlationId,
      causationId: opts.causationId,
      externalId: opts.externalId,
      tenantId: opts.tenantId,
      occurredAt: opts.occurredAt ?? new Date(),
    };

    // Emit the event using the EventEmitter2 instance
    this.emitter.emit(eventName, envelope);
  }
}

/**
 * Normalizes an entity reference to ensure it conforms to the EntityRef structure.
 *
 * @param input - The entity to normalize, which can be:
 *   - A TypeORM entity
 *   - A plain object with an `id` property
 *   - An EntityRef object
 * @returns An EntityRef object or undefined if the input is invalid.
 */
function normalizeEntityRef(input?: object | EntityRef): EntityRef | undefined {
  if (!input) return undefined;

  // Check if the input already conforms to the EntityRef structure
  if ('entityId' in (input as any) && 'entityType' in (input as any)) {
    return input as EntityRef;
  }

  const anyObj = input as any;

  // Attempt to extract the entityId from the input object
  const entityId =
    anyObj?.id ??
    anyObj?.entityId ??
    (typeof anyObj?.getId === 'function' ? anyObj.getId() : null);

  // Attempt to extract the entityType from the input object
  const entityType =
    anyObj?.entityType ??
    (anyObj?.constructor?.name ? anyObj.constructor.name : null);

  // Return the normalized EntityRef object
  return { entityType, entityId };
}