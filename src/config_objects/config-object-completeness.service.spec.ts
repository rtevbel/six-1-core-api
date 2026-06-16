import { ConfigObjectCompletenessService } from './config-object-completeness.service';
import type { ConfigObjectsService } from './config_objects.service';

describe('ConfigObjectCompletenessService', () => {
  const configObjectsService = {
    loadCoreRecord: jest.fn(),
    resolveObjectInstance: jest.fn(),
    getCustomObjectInstanceSnapshot: jest.fn(),
  };

  let service: ConfigObjectCompletenessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConfigObjectCompletenessService(
      configObjectsService as unknown as ConfigObjectsService,
    );
  });

  it('evaluates system_table bindings using core columns only', async () => {
    configObjectsService.loadCoreRecord.mockResolvedValue({
      customerId: 5,
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    const result = await service.isBindingComplete({
      tenantId: 1,
      objectType: 'customer',
      resolutionMode: 'system_table',
      completionRule: { type: 'payload_valid' },
      coreId: 5,
    });

    expect(result.valid).toBe(true);
    expect(configObjectsService.resolveObjectInstance).not.toHaveBeenCalled();
  });

  it('rejects empty system_table core snapshots', async () => {
    configObjectsService.loadCoreRecord.mockResolvedValue({
      customerId: 5,
      firstName: '',
      lastName: null,
    });

    const result = await service.isBindingComplete({
      tenantId: 1,
      objectType: 'customer',
      resolutionMode: 'system_table',
      completionRule: { type: 'payload_valid' },
      coreId: 5,
    });

    expect(result.valid).toBe(false);
  });

  it('evaluates standalone bindings with minStatus', async () => {
    const result = service.evaluateBindingCompletion({
      tenantId: 1,
      objectType: 'invoice',
      resolutionMode: 'standalone',
      completionRule: { type: 'payload_valid', minStatus: 'submitted' },
      snapshot: {
        fields: { amount: 100 },
        status: 'DRAFT',
      },
    });

    expect(result.valid).toBe(false);
  });
});
