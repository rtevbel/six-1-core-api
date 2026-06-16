import { Injectable, Logger } from '@nestjs/common';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import {
  evaluateJsonLogicRuleOptional,
  isJsonLogicRule,
} from './process-step-extension-json-logic.util';
import type {
  ProcessStepExtensionEvaluationData,
  ProcessStepExtensionEvaluationInput,
  ProcessStepExtensionEvaluationResult,
} from './process-step-extension-evaluator.types';

/**
 * Evaluates Runner v2 step extension json-logic rules (`visibleWhen`, `autoAdvanceWhen`).
 */
@Injectable()
export class ProcessStepExtensionEvaluatorService {
  private readonly logger = new Logger(ProcessStepExtensionEvaluatorService.name);

  constructor(private readonly processFlags: ProcessFeatureFlagsService) {}

  isEnabled(): boolean {
    return this.processFlags.isRunnerV2Enabled();
  }

  buildEvaluationData(
    input: Omit<ProcessStepExtensionEvaluationInput, 'extensions'>,
  ): ProcessStepExtensionEvaluationData {
    return {
      context:
        input.processContext && typeof input.processContext === 'object'
          ? { ...input.processContext }
          : {},
      subject: input.subject,
      step: input.step,
      bindings: input.bindings ?? [],
    };
  }

  /**
   * Evaluates extension rules for a step. When Runner v2 is disabled, returns safe v1 defaults.
   */
  evaluate(
    input: ProcessStepExtensionEvaluationInput,
  ): ProcessStepExtensionEvaluationResult {
    if (!this.isEnabled()) {
      return {
        isVisible: true,
        autoAdvanceEligible: false,
        visibleWhenResult: null,
        autoAdvanceWhenResult: null,
      };
    }

    const data = this.buildEvaluationData(input);
    const rules = readExtensionRules(input.extensions);

    const visible = this.evaluateVisibleWhen(rules.visibleWhen, data);
    const autoAdvance = this.evaluateAutoAdvanceWhen(rules.autoAdvanceWhen, data);

    return {
      isVisible: visible.value,
      autoAdvanceEligible: autoAdvance.value,
      visibleWhenResult: visible.ruleApplied ? visible.value : null,
      autoAdvanceWhenResult: autoAdvance.ruleApplied ? autoAdvance.value : null,
    };
  }

  evaluateVisibleWhen(
    rule: Record<string, unknown> | null | undefined,
    data: ProcessStepExtensionEvaluationData,
  ): { value: boolean; ruleApplied: boolean } {
    return this.safeEvaluate(rule, data, true, 'visibleWhen');
  }

  evaluateAutoAdvanceWhen(
    rule: Record<string, unknown> | null | undefined,
    data: ProcessStepExtensionEvaluationData,
  ): { value: boolean; ruleApplied: boolean } {
    return this.safeEvaluate(rule, data, false, 'autoAdvanceWhen');
  }

  private safeEvaluate(
    rule: Record<string, unknown> | null | undefined,
    data: ProcessStepExtensionEvaluationData,
    defaultWhenAbsent: boolean,
    field: 'visibleWhen' | 'autoAdvanceWhen',
  ): { value: boolean; ruleApplied: boolean } {
    if (!isJsonLogicRule(rule)) {
      return { value: defaultWhenAbsent, ruleApplied: false };
    }

    try {
      return evaluateJsonLogicRuleOptional(rule, data, defaultWhenAbsent);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Step extension ${field} evaluation failed: ${message}`,
      );
      return { value: defaultWhenAbsent, ruleApplied: false };
    }
  }
}

function readExtensionRules(
  raw: Record<string, unknown> | null | undefined,
): {
  visibleWhen: Record<string, unknown> | null;
  autoAdvanceWhen: Record<string, unknown> | null;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { visibleWhen: null, autoAdvanceWhen: null };
  }

  const visibleWhen = raw.visibleWhen;
  const autoAdvanceWhen = raw.autoAdvanceWhen;

  return {
    visibleWhen: isJsonLogicRule(visibleWhen) ? visibleWhen : null,
    autoAdvanceWhen: isJsonLogicRule(autoAdvanceWhen) ? autoAdvanceWhen : null,
  };
}
