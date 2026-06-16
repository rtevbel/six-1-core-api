import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  loadProcessFeatureFlags,
  type ProcessFeatureFlags,
} from './process-feature.config';

/**
 * Reads dynamic-process rollout flags from configuration.
 * Inject where new behavior must stay gated during phased rollout.
 */
@Injectable()
export class ProcessFeatureFlagsService {
  private readonly flags: ProcessFeatureFlags;

  constructor(private readonly configService: ConfigService) {
    this.flags = loadProcessFeatureFlags(this.configService);
  }

  /** Snapshot of all flags (immutable for this process lifetime). */
  getAll(): Readonly<ProcessFeatureFlags> {
    return this.flags;
  }

  isSubjectModelEnabled(): boolean {
    return this.flags.subjectModelEnabled;
  }

  isConfigObjectStepsEnabled(): boolean {
    return this.flags.configObjectStepsEnabled;
  }

  isCallProcessEnabled(): boolean {
    return this.flags.callProcessEnabled;
  }

  isTier2InstanceSubjectEnabled(): boolean {
    return this.flags.tier2InstanceSubjectEnabled;
  }

  isTier3WorkflowSubjectEnabled(): boolean {
    return this.flags.tier3WorkflowSubjectEnabled;
  }

  isTier1ScheduledTaskEnabled(): boolean {
    return this.flags.tier1ScheduledTaskEnabled;
  }

  isTier4SorEntityEnabled(): boolean {
    return this.flags.tier4SorEntityEnabled;
  }

  isStepActionsEnabled(): boolean {
    return this.flags.stepActionsEnabled;
  }

  isEventStartRegistryEnabled(): boolean {
    return this.flags.eventStartRegistryEnabled;
  }

  /** Runner v2: visibleWhen, skip/retry, autoAdvance, failure recovery (F track). */
  isRunnerV2Enabled(): boolean {
    return this.flags.runnerV2Enabled;
  }

  /** Runner v3: parallel groups, batch start, collaboration locks (G track). */
  isRunnerV3Enabled(): boolean {
    return this.flags.runnerV3Enabled;
  }
}
