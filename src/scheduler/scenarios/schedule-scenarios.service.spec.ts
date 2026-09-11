import { ScheduleScenariosService } from './schedule-scenarios.service';
import { ScheduleScenarioStatus } from '../constants';

describe('ScheduleScenariosService state rules', () => {
  it('rejects setting final via setStatus', async () => {
    const service = Object.create(
      ScheduleScenariosService.prototype,
    ) as ScheduleScenariosService;

    await expect(
      service.setStatus(1, {
        tenantId: 1,
        scheduleScenarioId: 1,
        status: 'final' as Exclude<ScheduleScenarioStatus, 'final'>,
      }),
    ).rejects.toBeTruthy();
  });
});
