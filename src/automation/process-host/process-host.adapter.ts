import type {
  ProcessHostContext,
  StepStateChangedContext,
} from './process-host.context';

/**
 * Host integration for a {@link ProcessHostContext.subjectType}.
 * Tier 1 uses dedicated adapters; Tier 2/3 use generic implementations.
 */
export interface ProcessHostAdapter {
  readonly subjectType: string;

  onProcessStarted(ctx: ProcessHostContext): Promise<void>;

  onStepStateChanged(ctx: StepStateChangedContext): Promise<void>;

  onProcessCompleted(ctx: ProcessHostContext): Promise<void>;

  onProcessFailed(ctx: ProcessHostContext): Promise<void>;

  canCompleteJob(ctx: ProcessHostContext): Promise<boolean>;
}
