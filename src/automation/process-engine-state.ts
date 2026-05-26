/** Process step engine states used by StepOrchestratorService and project mappings. */
export type ProcessEngineState =
  | 'pending'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'canceled';

export interface ProcessHostAdvanceOptions {
  actorTenantUserId?: number;
  correlationId?: string;
}
