import { ProcessHostRegistry } from './process-host.registry';
import { ProjectHostAdapter } from './project-host.adapter';
import { ConfigurableInstanceHostAdapter } from './configurable-instance-host.adapter';
import { GenericWorkflowHostAdapter } from './generic-workflow-host.adapter';
import {
  PROCESS_SUBJECT_TYPE_PROJECT,
  PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
  PROCESS_SUBJECT_TYPE_WORKFLOW,
} from '../process-subject.constants';
import { ScheduledTaskHostAdapter } from './scheduled-task-host.adapter';

describe('ProcessHostRegistry', () => {
  const registry = new ProcessHostRegistry(
    { subjectType: PROCESS_SUBJECT_TYPE_PROJECT } as ProjectHostAdapter,
    { subjectType: PROCESS_SUBJECT_TYPE_SCHEDULED_TASK } as ScheduledTaskHostAdapter,
    {
      subjectType: 'config_custom_object_instance',
    } as ConfigurableInstanceHostAdapter,
    { subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW } as GenericWorkflowHostAdapter,
  );

  it('resolves registered adapters', () => {
    expect(registry.get(PROCESS_SUBJECT_TYPE_PROJECT).subjectType).toBe(
      PROCESS_SUBJECT_TYPE_PROJECT,
    );
    expect(registry.get(PROCESS_SUBJECT_TYPE_WORKFLOW).subjectType).toBe(
      PROCESS_SUBJECT_TYPE_WORKFLOW,
    );
    expect(registry.get(PROCESS_SUBJECT_TYPE_SCHEDULED_TASK).subjectType).toBe(
      PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
    );
  });

  it('throws for unknown subject types', () => {
    expect(() => registry.get('unknown')).toThrow(
      /No process host adapter registered/,
    );
  });
});
