import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TaskEntity } from './entities/task.entity';
import { ProcessTemplateStepsService } from '../../process_templates/process_template_steps/process_template_steps.service';
import { ProjectTaskStatusesService } from '../project_task_statuses/project_task_statuses.service';
import { ConfigLifecycleService } from '../../config_objects/config_lifecycle.service';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(TaskEntity),
          useValue: {},
        },
        {
          provide: ProcessTemplateStepsService,
          useValue: {},
        },
        {
          provide: ProjectTaskStatusesService,
          useValue: {},
        },
        {
          provide: ConfigLifecycleService,
          useValue: {},
        },
        {
          provide: ConfigObjectsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
