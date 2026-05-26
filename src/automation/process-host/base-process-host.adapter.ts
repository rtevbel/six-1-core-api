import type { ProcessHostAdapter } from './process-host.adapter';
import type {
  ProcessHostContext,
  StepStateChangedContext,
} from './process-host.context';

/**
 * No-op defaults for host hooks; subclasses override selectively.
 */
export abstract class BaseProcessHostAdapter implements ProcessHostAdapter {
  abstract readonly subjectType: string;

  async onProcessStarted(_ctx: ProcessHostContext): Promise<void> {}

  async onStepStateChanged(_ctx: StepStateChangedContext): Promise<void> {}

  async onProcessCompleted(_ctx: ProcessHostContext): Promise<void> {}

  async onProcessFailed(_ctx: ProcessHostContext): Promise<void> {}

  async canCompleteJob(_ctx: ProcessHostContext): Promise<boolean> {
    return false;
  }
}
