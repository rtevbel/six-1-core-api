import { RpcException } from '@nestjs/microservices';
import { PromoteOrchestratorService } from './promote-orchestrator.service';

describe('PromoteOrchestratorService', () => {
  it('rejects promote when scenario is not definitive (definitive_only)', async () => {
    const scenarios = {
      findOneOrFail: jest.fn().mockResolvedValue({
        scheduleScenarioId: 9,
        status: 'draft',
        revision: 1,
        schedulingRequirementId: 3,
      }),
    };
    const requirements = {
      findOneOrFail: jest.fn().mockResolvedValue({
        schedulingRequirementId: 3,
        status: 'open',
        definitiveScenarioId: null,
        promotePolicy: { promoteFrom: 'definitive_only' },
      }),
    };
    const tenantUsers = {
      assertTenantAccess: jest.fn().mockResolvedValue({ tenantId: 1 }),
    };
    const service = new PromoteOrchestratorService(
      {} as any,
      scenarios as any,
      requirements as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      tenantUsers as any,
      {} as any,
      {} as any,
    );

    try {
      await service.promote(1, { tenantId: 1, scheduleScenarioId: 9 });
      fail('expected promote_requires_definitive');
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      expect((e as RpcException).getError()).toMatchObject({
        statusCode: 400,
        errorCode: 'promote_requires_definitive',
      });
    }
  });
});
