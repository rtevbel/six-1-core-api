import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigurationsController } from './system_configurations.controller';
import { SystemConfigurationsService } from './system_configurations.service';

describe('SystemConfigurationsController', () => {
  let controller: SystemConfigurationsController;
  const service = {
    createGroup: jest.fn(),
    findAllGroups: jest.fn(),
    findOneGroup: jest.fn(),
    updateGroup: jest.fn(),
    removeGroup: jest.fn(),
    createDefinition: jest.fn(),
    findAllDefinitions: jest.fn(),
    findOneDefinition: jest.fn(),
    updateDefinition: jest.fn(),
    removeDefinition: jest.fn(),
    setValue: jest.fn(),
    clearValue: jest.fn(),
    findValues: jest.fn(),
    resolve: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemConfigurationsController],
      providers: [
        { provide: SystemConfigurationsService, useValue: service },
      ],
    }).compile();

    controller = module.get(SystemConfigurationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates createGroup to service', async () => {
    service.createGroup.mockResolvedValue({ groupId: 1 });
    await expect(
      controller.createGroup(1, { groupKey: 'auth', label: 'Auth' }),
    ).resolves.toEqual({ groupId: 1 });
    expect(service.createGroup).toHaveBeenCalledWith(1, {
      groupKey: 'auth',
      label: 'Auth',
    });
  });

  it('delegates resolve to service', async () => {
    service.resolve.mockResolvedValue({ tenantId: null, groups: {} });
    await controller.resolve(1, { tenantId: 0 });
    expect(service.resolve).toHaveBeenCalledWith(1, { tenantId: 0 });
  });
});
