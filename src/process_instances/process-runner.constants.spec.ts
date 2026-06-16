import {
  PROCESS_RUNNER_DEFAULT_CHILD_DEPTH,
  PROCESS_RUNNER_MAX_CHILD_DEPTH,
} from './process-runner.constants';

describe('process-runner.constants', () => {
  it('defaults to summary-only children', () => {
    expect(PROCESS_RUNNER_DEFAULT_CHILD_DEPTH).toBe(0);
  });

  it('caps nested runner depth', () => {
    expect(PROCESS_RUNNER_MAX_CHILD_DEPTH).toBe(2);
  });
});
