import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessTemplateStepActionsService } from './process_template_step_actions.service';
import { ProcessTemplateStepActionEntity } from './entities/process_template_step_action.entity';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';
import { ConfigObjectEntity } from '../../../config_objects/entities/config_object.entity';
import { NotificationTemplateEntity } from '../../../notifications/notification_templates/entities/notification_template.entity';
import { ConfigObjectsService } from '../../../config_objects/config_objects.service';
import {
  PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
  PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
} from '../../../automation/process-step-action.constants';

describe('ProcessTemplateStepActionsService', () => {
  let service: ProcessTemplateStepActionsService;
  let actionRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
  };
  let stepRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    actionRepo = {
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => ({ stepActionId: 1, ...row })),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };
    stepRepo = {
      findOne: jest.fn().mockResolvedValue({
        processTemplateStepId: 10,
        processTemplate: { tenantId: 5 },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessTemplateStepActionsService,
        {
          provide: getRepositoryToken(ProcessTemplateStepActionEntity),
          useValue: actionRepo,
        },
        {
          provide: getRepositoryToken(ProcessTemplateStepEntity),
          useValue: stepRepo,
        },
        {
          provide: getRepositoryToken(ConfigObjectEntity),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(NotificationTemplateEntity),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: ConfigObjectsService,
          useValue: { getObjectListFieldCatalog: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ProcessTemplateStepActionsService);
  });

  it('creates a template step action when config is valid', async () => {
    const created = await service.create(99, {
      processTemplateStepId: 10,
      actionType: PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
      runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
      config: { eventName: 'six1-event.process_completed' },
      createdBy: 99,
      tenantId: 5,
    });

    expect(created.stepActionId).toBe(1);
    expect(actionRepo.save).toHaveBeenCalled();
  });

  it('rejects invalid action config', async () => {
    await expect(
      service.create(99, {
        processTemplateStepId: 10,
        actionType: PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
        runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
        config: {},
        createdBy: 99,
        tenantId: 5,
      }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('rejects unknown template step', async () => {
    stepRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create(99, {
        processTemplateStepId: 10,
        actionType: PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
        runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
        config: { eventName: 'six1-event.process_completed' },
        createdBy: 99,
        tenantId: 5,
      }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('rejects findOne when tenant scope mismatches', async () => {
    actionRepo.findOne.mockResolvedValueOnce({
      stepActionId: 1,
      processTemplateStep: {
        processTemplate: { tenantId: 5 },
      },
    });

    await expect(service.findOne(99, { stepActionId: 1, tenantId: 99 })).rejects.toBeInstanceOf(
      RpcException,
    );
  });
});
