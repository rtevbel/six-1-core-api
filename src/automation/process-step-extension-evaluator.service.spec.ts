import {
  applyJsonLogicRule,
  evaluateJsonLogicRuleOptional,
  isJsonLogicRule,
} from './process-step-extension-json-logic.util';
import { ProcessStepExtensionEvaluatorService } from './process-step-extension-evaluator.service';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';

describe('process-step-extension-json-logic.util', () => {
  it('isJsonLogicRule rejects non-objects', () => {
    expect(isJsonLogicRule(null)).toBe(false);
    expect(isJsonLogicRule([])).toBe(false);
    expect(isJsonLogicRule({})).toBe(false);
    expect(isJsonLogicRule({ '==': [1, 1] })).toBe(true);
  });

  it('applyJsonLogicRule evaluates context paths', () => {
    const rule = { '==': [{ var: 'context.customerType' }, 'B2B'] };
    expect(
      applyJsonLogicRule(rule, { context: { customerType: 'B2B' } }),
    ).toBe(true);
    expect(
      applyJsonLogicRule(rule, { context: { customerType: 'B2C' } }),
    ).toBe(false);
  });

  it('evaluateJsonLogicRuleOptional uses default when rule absent', () => {
    expect(evaluateJsonLogicRuleOptional(null, {}, true)).toEqual({
      value: true,
      ruleApplied: false,
    });
    expect(evaluateJsonLogicRuleOptional(undefined, {}, false)).toEqual({
      value: false,
      ruleApplied: false,
    });
  });
});

describe('ProcessStepExtensionEvaluatorService', () => {
  const baseInput = {
    processContext: { customerType: 'B2B', onboardingPhase: 'kyc' },
    subject: { type: 'workflow', id: 100, metadata: { objectType: 'customer' } },
    step: {
      stepInstanceId: 501,
      stepOrder: 2,
      status: 'ready',
      taskType: 'manual',
      isOptional: false,
    },
    bindings: [
      {
        objectType: 'customer',
        status: 'valid',
        coreId: 42,
        resolutionMode: 'sor_bound',
      },
    ],
  };

  function createService(runnerV2Enabled: boolean) {
    const flags = {
      isRunnerV2Enabled: jest.fn().mockReturnValue(runnerV2Enabled),
    } as unknown as ProcessFeatureFlagsService;
    return new ProcessStepExtensionEvaluatorService(flags);
  }

  it('returns v1 defaults when Runner v2 flag is off', () => {
    const service = createService(false);
    const result = service.evaluate({
      ...baseInput,
      extensions: {
        visibleWhen: { '==': [{ var: 'context.customerType' }, 'B2C'] },
        autoAdvanceWhen: { '==': [{ var: 'context.profileCaptureComplete' }, true] },
      },
    });

    expect(result).toEqual({
      isVisible: true,
      autoAdvanceEligible: false,
      visibleWhenResult: null,
      autoAdvanceWhenResult: null,
    });
  });

  it('visibleWhen true shows step; false hides', () => {
    const service = createService(true);

    expect(
      service.evaluate({
        ...baseInput,
        extensions: {
          visibleWhen: { '==': [{ var: 'context.customerType' }, 'B2B'] },
        },
      }).isVisible,
    ).toBe(true);

    expect(
      service.evaluate({
        ...baseInput,
        extensions: {
          visibleWhen: { '==': [{ var: 'context.customerType' }, 'B2C'] },
        },
      }).isVisible,
    ).toBe(false);
  });

  it('missing visibleWhen defaults to visible', () => {
    const service = createService(true);
    const result = service.evaluate({
      ...baseInput,
      extensions: {},
    });
    expect(result.isVisible).toBe(true);
    expect(result.visibleWhenResult).toBeNull();
  });

  it('missing autoAdvanceWhen defaults to not eligible', () => {
    const service = createService(true);
    const result = service.evaluate({
      ...baseInput,
      extensions: { visibleWhen: { '==': [1, 1] } },
    });
    expect(result.autoAdvanceEligible).toBe(false);
    expect(result.autoAdvanceWhenResult).toBeNull();
  });

  it('autoAdvanceWhen true when rule matches', () => {
    const service = createService(true);
    const result = service.evaluate({
      ...baseInput,
      processContext: { ...baseInput.processContext, profileCaptureComplete: true },
      step: { ...baseInput.step, taskType: 'automated' },
      extensions: {
        autoAdvanceWhen: {
          and: [
            { '==': [{ var: 'step.taskType' }, 'automated'] },
            { '==': [{ var: 'context.profileCaptureComplete' }, true] },
          ],
        },
      },
    });
    expect(result.autoAdvanceEligible).toBe(true);
    expect(result.autoAdvanceWhenResult).toBe(true);
  });

  it('treats missing context fields as false in comparisons', () => {
    const service = createService(true);
    const result = service.evaluate({
      ...baseInput,
      processContext: {},
      extensions: {
        visibleWhen: { '==': [{ var: 'context.customerType' }, 'B2B'] },
      },
    });
    expect(result.isVisible).toBe(false);
  });

  it('buildEvaluationData normalizes null context to empty object', () => {
    const service = createService(true);
    expect(
      service.buildEvaluationData({
        ...baseInput,
        processContext: null,
      }).context,
    ).toEqual({});
  });
});
