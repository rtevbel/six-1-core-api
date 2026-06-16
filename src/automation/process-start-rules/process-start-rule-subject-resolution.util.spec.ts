import {
  buildResolvedProcessStartSubject,
  resolveProcessStartContextPatch,
  resolveProcessStartSubjectId,
} from './process-start-rule-subject-resolution.util';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import { PROCESS_SUBJECT_TYPE_WORKFLOW } from '../process-subject.constants';

describe('process-start-rule-subject-resolution.util', () => {
  const envelope = {
    eventName: PLATFORM_EVENT_NAMES.TENANT_CREATED,
    tenantId: 42,
    entity: { entityType: 'tenant', entityId: 42 },
    data: { plan: 'standard' },
  };

  it('resolves workflow_self subject id as 0', () => {
    expect(
      resolveProcessStartSubjectId(
        'workflow_self',
        PROCESS_SUBJECT_TYPE_WORKFLOW,
        envelope,
      ),
    ).toBe(0);
  });

  it('resolves dot-path subject ids from the envelope', () => {
    expect(
      resolveProcessStartSubjectId(
        'entity.entityId',
        PROCESS_SUBJECT_TYPE_WORKFLOW,
        envelope,
      ),
    ).toBe(42);
  });

  it('resolves path-based context patch values', () => {
    expect(
      resolveProcessStartContextPatch(
        {
          tenantId: { path: 'entity.entityId' },
          plan: 'standard',
        },
        envelope,
      ),
    ).toEqual({
      tenantId: 42,
      plan: 'standard',
    });
  });

  it('builds a full resolved subject for tenant.created onboarding', () => {
    expect(
      buildResolvedProcessStartSubject({
        subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
        subjectIdSource: 'workflow_self',
        contextPatch: {
          tenantId: { path: 'entity.entityId' },
        },
        envelope,
      }),
    ).toEqual({
      subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
      subjectId: 0,
      context: { tenantId: 42 },
    });
  });
});
