import { RpcException } from '@nestjs/microservices';
import { PromoteOrchestratorService } from './promote-orchestrator.service';

describe('PromoteOrchestratorService', () => {
  it('rejects promote when scenario is not active', async () => {
    const scenarios = {
      findOneOrFail: jest.fn().mockResolvedValue({
        scheduleScenarioId: 9,
        status: 'draft',
        revision: 1,
        schedulingRequirementId: 3,
      }),
    };
    const service = new PromoteOrchestratorService(
      {} as any,
      scenarios as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.promote(1, { tenantId: 1, scheduleScenarioId: 9 }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
