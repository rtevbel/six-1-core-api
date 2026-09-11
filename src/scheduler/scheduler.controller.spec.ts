import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './services/scheduler.service';
import { SchedulingRequirementsService } from './requirements/scheduling-requirements.service';
import { ScheduleScenariosService } from './scenarios/schedule-scenarios.service';
import { PromoteOrchestratorService } from './scenarios/promote-orchestrator.service';
import { ScenarioPlanningService } from './planning/scenario-planning.service';

describe('SchedulerController', () => {
  let controller: SchedulerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulerController],
      providers: [
        {
          provide: SchedulerService,
          useValue: {
            scheduleTaskWindow: jest.fn(),
            scheduleFromShifts: jest.fn(),
            findAll: jest.fn(),
            findAllByTask: jest.fn(),
            findOne: jest.fn(),
            reschedule: jest.fn(),
            pause: jest.fn(),
            resume: jest.fn(),
            cancel: jest.fn(),
            validatePlacement: jest.fn(),
            utilization: jest.fn(),
          },
        },
        {
          provide: SchedulingRequirementsService,
          useValue: { create: jest.fn() },
        },
        {
          provide: ScheduleScenariosService,
          useValue: { create: jest.fn() },
        },
        {
          provide: PromoteOrchestratorService,
          useValue: { promote: jest.fn() },
        },
        {
          provide: ScenarioPlanningService,
          useValue: { findPlannedTasks: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    controller = module.get<SchedulerController>(SchedulerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
