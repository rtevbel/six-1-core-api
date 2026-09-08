import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './services/scheduler.service';

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
      ],
    }).compile();

    controller = module.get<SchedulerController>(SchedulerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
