import { Test, TestingModule } from '@nestjs/testing';
import { ProjectTaskStatusesService } from './project_task_statuses.service';

describe('ProjectTaskStatusesService', () => {
  let service: ProjectTaskStatusesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectTaskStatusesService],
    }).compile();

    service = module.get<ProjectTaskStatusesService>(
      ProjectTaskStatusesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
