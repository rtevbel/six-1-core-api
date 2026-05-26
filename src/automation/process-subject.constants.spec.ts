import {
  isProcessSubjectType,
  PROCESS_SUBJECT_TYPE_PROJECT,
  PROCESS_SUBJECT_TYPE_WORKFLOW,
} from './process-subject.constants';

describe('process-subject.constants', () => {
  it('accepts known subject types', () => {
    expect(isProcessSubjectType(PROCESS_SUBJECT_TYPE_PROJECT)).toBe(true);
    expect(isProcessSubjectType(PROCESS_SUBJECT_TYPE_WORKFLOW)).toBe(true);
  });

  it('rejects unknown subject types', () => {
    expect(isProcessSubjectType('invoice')).toBe(false);
    expect(isProcessSubjectType('')).toBe(false);
  });
});
