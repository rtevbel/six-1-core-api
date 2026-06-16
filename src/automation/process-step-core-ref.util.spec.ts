import {
  PROCESS_SUBJECT_TYPE_PROJECT,
  PROCESS_SUBJECT_TYPE_SOR_ENTITY,
} from './process-subject.constants';
import {
  resolveCoreIdForObjectType,
  resolveStandaloneInstanceIdForObjectType,
} from './process-step-core-ref.util';

describe('process-step-core-ref.util', () => {
  it('resolves project coreId from project subject', () => {
    expect(
      resolveCoreIdForObjectType(
        {
          subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
          subjectId: 1001,
          subjectMetadata: null,
          context: null,
        },
        'project',
      ),
    ).toBe(1001);
  });

  it('resolves customer coreId from sor_entity subject metadata', () => {
    expect(
      resolveCoreIdForObjectType(
        {
          subjectType: PROCESS_SUBJECT_TYPE_SOR_ENTITY,
          subjectId: 42,
          subjectMetadata: { objectType: 'customer', coreId: 42 },
          context: null,
        },
        'customer',
      ),
    ).toBe(42);
  });

  it('resolves coreId from workflow context', () => {
    expect(
      resolveCoreIdForObjectType(
        {
          subjectType: 'workflow',
          subjectId: 1,
          subjectMetadata: null,
          context: { customerId: 900 },
        },
        'customer',
      ),
    ).toBe(900);
  });

  it('resolves tenant coreId from workflow context tenantId', () => {
    expect(
      resolveCoreIdForObjectType(
        {
          subjectType: 'workflow',
          subjectId: 1,
          subjectMetadata: null,
          context: { tenantId: 12 },
        },
        'tenant',
      ),
    ).toBe(12);
  });

  it('resolves standalone instance id from context', () => {
    expect(
      resolveStandaloneInstanceIdForObjectType(
        {
          subjectType: 'workflow',
          subjectId: 1,
          subjectMetadata: null,
          context: { configCustomObjectInstanceId: 55 },
        },
        'onboarding_form',
      ),
    ).toBe(55);
  });
});
