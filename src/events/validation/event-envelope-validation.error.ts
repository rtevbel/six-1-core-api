export class EventEnvelopeValidationError extends Error {
  constructor(
    public readonly eventName: string,
    public readonly issues: string[],
  ) {
    super(
      `Invalid platform event envelope for ${eventName}: ${issues.join('; ')}`,
    );
    this.name = 'EventEnvelopeValidationError';
  }
}
