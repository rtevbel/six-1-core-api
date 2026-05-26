/**
 * Job anchor passed when starting a process instance.
 */
export interface ProcessInstanceSubjectInput {
  subjectType: string;
  subjectId: number;
  subjectMetadata?: Record<string, unknown> | null;
}

export interface ProcessInstantiationOptions {
  subject?: ProcessInstanceSubjectInput;
  parentInstanceId?: number | null;
  parentStepId?: number | null;
  onChildFailure?: 'ignore' | 'pause_parent' | 'fail_parent';
  context?: Record<string, unknown> | null;
}
