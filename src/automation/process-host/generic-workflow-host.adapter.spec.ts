import { GenericWorkflowHostAdapter } from './generic-workflow-host.adapter';
import type { ProcessHostContext } from './process-host.context';
import { PROCESS_SUBJECT_TYPE_WORKFLOW } from '../process-subject.constants';

describe('GenericWorkflowHostAdapter', () => {
  const adapter = new GenericWorkflowHostAdapter();

  it('uses workflow subject type', () => {
    expect(adapter.subjectType).toBe(PROCESS_SUBJECT_TYPE_WORKFLOW);
  });

  it('does not query tasks table; may update process_instances subject_id', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const ctx: ProcessHostContext = {
      tenantId: 1,
      createdBy: 2,
      processInstanceId: 55,
      templateId: 3,
      subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
      subjectId: 0,
      entityManager: { query } as never,
    };

    await adapter.onProcessStarted(ctx);

    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toMatch(/UPDATE process_instances/);
    expect(String(query.mock.calls[0][0])).not.toMatch(/tasks/i);
  });
});
