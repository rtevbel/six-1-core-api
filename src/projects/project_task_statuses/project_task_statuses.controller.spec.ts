import { Test, TestingModule } from '@nestjs/testing';
import { ProjectTaskStatusesController } from './project_task_statuses.controller';
import { ProjectTaskStatusesService } from './project_task_statuses.service';

describe('ProjectTaskStatusesController', () => {
  let controller: ProjectTaskStatusesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectTaskStatusesController],
      providers: [ProjectTaskStatusesService],
    }).compile();

    controller = module.get<ProjectTaskStatusesController>(
      ProjectTaskStatusesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
