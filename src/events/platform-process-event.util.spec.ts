import { buildProcessStepEventOptions } from './platform-process-event.util';

describe('buildProcessStepEventOptions assignees', () => {
  it('includes assigneeId and assigneeIds in data payload', () => {
    const options = buildProcessStepEventOptions({
      tenantId: 1,
      stepInstanceId: 10,
      processInstanceId: 5,
      assigneeId: 42,
      assigneeIds: [42, 43],
    });

    expect(options.data).toMatchObject({
      assigneeId: 42,
      assigneeIds: [42, 43],
    });
  });
});
