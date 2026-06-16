import { NotificationVariableResolverService } from './notification-variable-resolver.service';
import { ConfigObjectVariableProvider } from '../context/providers/config-object-variable.provider';
import type { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';

describe('NotificationVariableResolverService', () => {
  const configObjectVariableProvider = {
    hydrateLegacyFlatVariables: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<ConfigObjectVariableProvider, 'hydrateLegacyFlatVariables'>
  >;

  const service = new NotificationVariableResolverService(
    { getRepository: jest.fn() } as any,
    { findOne: jest.fn() } as any,
    {
      buildProjectUrl: jest.fn(() => 'https://app/project/1'),
      buildTaskUrl: jest.fn(),
      buildCommentUrl: jest.fn(),
      buildTeamUrl: jest.fn(),
    } as any,
    configObjectVariableProvider,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates sor_bound project resolution to ConfigObjectVariableProvider', async () => {
    configObjectVariableProvider.hydrateLegacyFlatVariables.mockImplementation(
      async (variables) => {
        variables.projectName = 'From Config Object';
        variables.projectId = 42;
        return true;
      },
    );

    const eventLog = {
      eventId: 1,
      userId: 2,
      entityId: 42,
      entityType: 'project',
      payload: { tenantId: 5 },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    } as EventLogEntity;

    const variables = await service.resolve(eventLog);

    expect(
      configObjectVariableProvider.hydrateLegacyFlatVariables,
    ).toHaveBeenCalledWith(
      expect.any(Object),
      5,
      'project',
      42,
      expect.objectContaining({ projectName: 'name' }),
    );
    expect(variables.projectName).toBe('From Config Object');
    expect(variables.projectUrl).toBe('https://app/project/1');
  });
});
