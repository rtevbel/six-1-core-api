import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProjectsService } from './projects.service';
import { ProjectEntity } from './entities/project.entity';
import { EventsService } from '../events/events.service';
import { ProcessLifecycleFacade } from '../automation/process-lifecycle.facade';
import { StepOrchestratorService } from '../automation/step-orchestrator.service';
import { ConfigLifecycleService } from '../config_objects/config_lifecycle.service';
import { ConfigObjectsService } from '../config_objects/config_objects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: {},
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn(), emitAsync: jest.fn() },
        },
        {
          provide: EventsService,
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: ProcessLifecycleFacade,
          useValue: {},
        },
        {
          provide: StepOrchestratorService,
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

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
