import { ConfigService } from '@nestjs/config';
import {
  PROCESS_CALL_PROCESS_ENABLED_KEY,
  PROCESS_SUBJECT_MODEL_ENABLED_KEY,
} from './process-feature.constants';
import { parseProcessFeatureFlag } from './process-feature.config';
import { ProcessFeatureFlagsService } from './process-feature-flags.service';

describe('parseProcessFeatureFlag', () => {
  it('defaults to false when unset', () => {
    expect(parseProcessFeatureFlag(undefined)).toBe(false);
    expect(parseProcessFeatureFlag('')).toBe(false);
  });

  it('parses truthy strings', () => {
    expect(parseProcessFeatureFlag('true')).toBe(true);
    expect(parseProcessFeatureFlag('1')).toBe(true);
    expect(parseProcessFeatureFlag('YES')).toBe(true);
  });

  it('parses false for other values', () => {
    expect(parseProcessFeatureFlag('false')).toBe(false);
    expect(parseProcessFeatureFlag('0')).toBe(false);
  });
});

describe('ProcessFeatureFlagsService', () => {
  const mockGet = jest.fn();

  beforeEach(() => {
    mockGet.mockReset();
  });

  it('loads all flags false by default', () => {
    mockGet.mockReturnValue(undefined);
    const fresh = new ProcessFeatureFlagsService({
      get: mockGet,
    } as unknown as ConfigService);

    expect(fresh.getAll()).toEqual({
      subjectModelEnabled: false,
      configObjectStepsEnabled: false,
      callProcessEnabled: false,
      tier2InstanceSubjectEnabled: false,
      tier3WorkflowSubjectEnabled: false,
      tier1ScheduledTaskEnabled: false,
    });
  });

  it('reads enabled flags from config keys', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === PROCESS_SUBJECT_MODEL_ENABLED_KEY) return 'true';
      if (key === PROCESS_CALL_PROCESS_ENABLED_KEY) return '1';
      return undefined;
    });

    const fresh = new ProcessFeatureFlagsService({
      get: mockGet,
    } as unknown as ConfigService);

    expect(fresh.isSubjectModelEnabled()).toBe(true);
    expect(fresh.isCallProcessEnabled()).toBe(true);
    expect(fresh.isTier2InstanceSubjectEnabled()).toBe(false);
  });
});
