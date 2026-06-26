import { NotificationVariableResolverService } from './notification-variable-resolver.service';
import { ConfigObjectVariableProvider } from '../context/providers/config-object-variable.provider';
import type { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';

describe('NotificationVariableResolverService', () => {
  const configObjectVariableProvider = {
    hydrateLegacyFlatVariables: jest.fn(),
    resolveEntityFields: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      ConfigObjectVariableProvider,
      'hydrateLegacyFlatVariables' | 'resolveEntityFields'
    >
  >;

  const urlBuilder = {
    buildProjectUrl: jest.fn(() => 'https://app/project/42'),
    buildTaskUrl: jest.fn(() => 'https://app/task/7'),
  };

  const service = new NotificationVariableResolverService(
    { findOne: jest.fn() } as any,
    urlBuilder as any,
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
    expect(variables.projectUrl).toBe('https://app/project/42');
  });

  it('hydrates related sor_bound objects from configured relation metadata', async () => {
    configObjectVariableProvider.hydrateLegacyFlatVariables.mockImplementation(
      async (variables, _tenantId, objectType) => {
        if (objectType === 'task') {
          variables.taskName = 'Task A';
          variables.taskId = 7;
          variables.projectId = 42;
          return true;
        }
        if (objectType === 'project') {
          variables.projectName = 'Project B';
          variables.projectId = 42;
          return true;
        }
        return false;
      },
    );

    const eventLog = {
      eventId: 1,
      userId: 2,
      entityId: 7,
      entityType: 'task',
      payload: { tenantId: 5 },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    } as EventLogEntity;

    const variables = await service.resolve(eventLog);

    expect(configObjectVariableProvider.hydrateLegacyFlatVariables).toHaveBeenCalledTimes(
      2,
    );
    expect(variables.taskName).toBe('Task A');
    expect(variables.projectName).toBe('Project B');
    expect(variables.taskUrl).toBe('https://app/task/7');
    expect(variables.projectUrl).toBe('https://app/project/42');
  });

  it('hydrates standalone instances via generic field resolution', async () => {
    configObjectVariableProvider.resolveEntityFields.mockResolvedValue({
      companyName: 'Acme Corp',
      profile_completed_at: '2026-06-04T12:00:00.000Z',
    });

    const eventLog = {
      eventId: 1,
      userId: 2,
      entityId: 99,
      entityType: 'config_custom_object_instance',
      payload: {
        tenantId: 5,
        objectType: 'customer_profile',
        configCustomObjectInstanceId: 99,
      },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    } as EventLogEntity;

    const variables = await service.resolve(eventLog);

    expect(configObjectVariableProvider.resolveEntityFields).toHaveBeenCalledWith(
      5,
      'customer_profile',
      undefined,
      99,
    );
    expect(variables.companyName).toBe('Acme Corp');
    expect(
      configObjectVariableProvider.hydrateLegacyFlatVariables,
    ).not.toHaveBeenCalled();
  });
});
