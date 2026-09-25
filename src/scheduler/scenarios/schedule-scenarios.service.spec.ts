import { ScheduleScenariosService } from './schedule-scenarios.service';
import { ScheduleScenarioStatus } from '../constants';

describe('ScheduleScenariosService state rules', () => {
  it('rejects setting definitive via setStatus', async () => {
    const service = Object.create(
      ScheduleScenariosService.prototype,
    ) as ScheduleScenariosService;

    await expect(
      service.setStatus(1, {
        tenantId: 1,
        scheduleScenarioId: 1,
        status: 'definitive' as Exclude<ScheduleScenarioStatus, 'definitive'>,
      }),
    ).rejects.toBeTruthy();
  });
});
