import { RpcException } from '@nestjs/microservices';
import { ScheduleScenariosService } from './schedule-scenarios.service';

describe('ScheduleScenariosService ui_prefs (Week 9)', () => {
  const tenantUsers = {
    assertTenantAccess: jest.fn().mockResolvedValue({ tenantId: 20 }),
  };

  function build(overrides: {
    scenario?: Record<string, unknown>;
    assertTenantAccess?: jest.Mock;
  } = {}) {
    const scenario = {
      scheduleScenarioId: 12,
      schedulingRequirementId: 5,
      tenantId: 20,
      status: 'active',
      revision: 3,
      uiPrefs: { planningLensId: 'project-wbs', advancedKpis: false },
      ...(overrides.scenario ?? {}),
    };
    const scenarioRepo = {
      findOne: jest.fn().mockResolvedValue(scenario),
      save: jest.fn(async (row) => row),
    };
    const requirements = {
      findOneOrFail: jest.fn().mockResolvedValue({
        schedulingRequirementId: 5,
        status: 'open',
      }),
    };
    const events = { emit: jest.fn() };
    const service = new ScheduleScenariosService(
      scenarioRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      requirements as any,
      {} as any,
      {} as any,
      {} as any,
      {
        assertTenantAccess:
          overrides.assertTenantAccess ?? tenantUsers.assertTenantAccess,
      } as any,
      {} as any,
      events as any,
    );
    return { service, scenarioRepo, events, scenario };
  }

  it('getUiPrefs returns closed envelope + revision', async () => {
    const { service } = build();
    const view = await service.getUiPrefs(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
    });
    expect(view).toMatchObject({
      scheduleScenarioId: 12,
      tenantId: 20,
      revision: 3,
      uiPrefs: { planningLensId: 'project-wbs', advancedKpis: false },
    });
  });

  it('setUiPrefs merges and bumps revision', async () => {
    const { service, scenarioRepo, events } = build();
    const view = await service.setUiPrefs(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      expectedRevision: 3,
      uiPrefs: {
        planningLensId: 'manufacturing',
        panels: { map: false },
      },
    });
    expect(view.revision).toBe(4);
    expect(view.uiPrefs).toMatchObject({
      planningLensId: 'manufacturing',
      advancedKpis: false,
      panels: { map: false },
    });
    expect(scenarioRepo.save).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalled();
  });

  it('setUiPrefs rejects stale revision', async () => {
    const { service } = build();
    await expect(
      service.setUiPrefs(1, {
        tenantId: 20,
        scheduleScenarioId: 12,
        expectedRevision: 1,
        uiPrefs: { planningLensId: 'batch-production' },
      }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('setUiPrefs allows definitive scenarios (UI-only, not planning mutation)', async () => {
    const { service, scenarioRepo } = build({
      scenario: { status: 'definitive', revision: 7 },
    });
    const view = await service.setUiPrefs(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      expectedRevision: 7,
      uiPrefs: { planningLensId: 'manufacturing' },
    });
    expect(view.revision).toBe(8);
    expect(view.uiPrefs?.planningLensId).toBe('manufacturing');
    expect(scenarioRepo.save).toHaveBeenCalled();
  });

  it('setUiPrefs rejects archived scenarios', async () => {
    const { service } = build({
      scenario: { status: 'archived', revision: 2 },
    });
    await expect(
      service.setUiPrefs(1, {
        tenantId: 20,
        scheduleScenarioId: 12,
        expectedRevision: 2,
        uiPrefs: { planningLensId: 'manufacturing' },
      }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('getUiPrefs tenant forbidden', async () => {
    const assertTenantAccess = jest.fn().mockRejectedValue(
      new RpcException({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      }),
    );
    const { service } = build({ assertTenantAccess });
    await expect(
      service.getUiPrefs(1, { tenantId: 99, scheduleScenarioId: 12 }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
