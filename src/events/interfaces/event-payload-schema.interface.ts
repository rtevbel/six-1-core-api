/**
 * Minimal JSON Schema shape stored on {@link EventEntity.payloadSchema}.
 * Full JSON Schema validation is deferred; this documents intent for catalog consumers.
 */
export type EventPayloadSchema = Record<string, unknown>;
