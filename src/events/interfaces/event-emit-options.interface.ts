import type {
  EventEnvelopeRefs,
  PlatformEntityRef,
} from '../types';

/**
 * Options accepted by {@link EventsService.emit}, {@link EventsService.emitAsync},
 * and {@link EventsService.emitWithLogs}.
 */
export interface EventEmitOptions<TData = unknown> {
  entity?: object | PlatformEntityRef;
  refs?: EventEnvelopeRefs;
  userId?: number;
  createdBy?: number;
  data?: TData;
  correlationId?: string;
  causationId?: string;
  externalId?: string;
  tenantId?: number | string;
  occurredAt?: Date;
}
