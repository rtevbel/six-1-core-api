import { Test, TestingModule } from '@nestjs/testing';
import { SystemStatusesService } from './system_statuses.service';

describe('SystemStatusesService', () => {
  let service: SystemStatusesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemStatusesService],
    }).compile();

    service = module.get<SystemStatusesService>(SystemStatusesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
