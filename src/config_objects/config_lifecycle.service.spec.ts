import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ConfigLifecycleService } from './config_lifecycle.service';
import { ConfigObjectEntity } from './entities/config_object.entity';
import { ConfigObjectLifecycleEntity } from './entities/config_object_lifecycle.entity';
import { ConfigObjectLifecycleTransitionEntity } from './entities/config_object_lifecycle_transition.entity';
import { ConfigObjectFieldRuleEntity } from './entities/config_object_field_rule.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { TaskEntity } from '../projects/tasks/entities/task.entity';

describe('ConfigLifecycleService', () => {
  let service: ConfigLifecycleService;
  let configObjectRepo: Repository<ConfigObjectEntity>;
  let transitionRepo: Repository<ConfigObjectLifecycleTransitionEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigLifecycleService,
        {
          provide: getRepositoryToken(ConfigObjectEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectLifecycleEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectLifecycleTransitionEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectFieldRuleEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<ConfigLifecycleService>(ConfigLifecycleService);
    configObjectRepo = module.get(getRepositoryToken(ConfigObjectEntity));
    transitionRepo = module.get(
      getRepositoryToken(ConfigObjectLifecycleTransitionEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('validateProjectStatusTransition should allow transition when config is absent', async () => {
    const project = {
      status: 'active',
    } as ProjectEntity;

    jest
      .spyOn(configObjectRepo, 'findOne')
      .mockResolvedValueOnce(null as any);

    await expect(
      service.validateProjectStatusTransition(project, 'completed'),
    ).resolves.toBeUndefined();
  });

  it('validateProjectStatusTransition should throw for invalid transition when config exists', async () => {
    const project = {
      status: 'active',
    } as ProjectEntity;

    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 100,
      objectType: 'project',
    } as any);

    jest
      .spyOn(transitionRepo, 'findOne')
      .mockResolvedValueOnce(null as any);

    await expect(
      service.validateProjectStatusTransition(project, 'archived'),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('validateTaskStatusTransition should allow when transition exists', async () => {
    const task = {
      taskStatusId: 1,
    } as TaskEntity;

    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 200,
      objectType: 'task',
    } as any);

    jest.spyOn(transitionRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 200,
      fromStateKey: '1',
      toStateKey: '2',
    } as any);

    await expect(
      service.validateTaskStatusTransition(task, 2),
    ).resolves.toBeUndefined();
  });
});

