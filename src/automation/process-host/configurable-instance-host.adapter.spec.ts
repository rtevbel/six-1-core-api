import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigurableInstanceHostAdapter } from './configurable-instance-host.adapter';
import { ConfigCustomObjectInstanceEntity } from '../../config_objects/entities/config_custom_object_instance.entity';
import type { ProcessHostContext } from './process-host.context';

describe('ConfigurableInstanceHostAdapter', () => {
  let adapter: ConfigurableInstanceHostAdapter;
  const findOne = jest.fn();
  const query = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    findOne.mockResolvedValue({
      configCustomObjectInstanceId: 8842,
      tenantId: 1,
      status: 'DRAFT',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigurableInstanceHostAdapter,
        {
          provide: getRepositoryToken(ConfigCustomObjectInstanceEntity),
          useValue: { findOne },
        },
      ],
    }).compile();

    adapter = module.get(ConfigurableInstanceHostAdapter);
  });

  it('does not query tasks table on process start', async () => {
    const ctx: ProcessHostContext = {
      tenantId: 1,
      createdBy: 2,
      processInstanceId: 99,
      templateId: 3,
      subjectType: 'config_custom_object_instance',
      subjectId: 8842,
      entityManager: { query } as never,
    };

    await adapter.onProcessStarted(ctx);

    expect(findOne).toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    const sql = query.mock.calls.map((c) => String(c[0])).join(' ');
    expect(sql).not.toMatch(/tasks/i);
  });
});
