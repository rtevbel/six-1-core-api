import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplatesController } from './process_templates.controller';
import { ProcessTemplatesService } from './process_templates.service';

describe('ProcessTemplatesController', () => {
  let controller: ProcessTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessTemplatesController],
      providers: [ProcessTemplatesService],
    }).compile();

    controller = module.get<ProcessTemplatesController>(ProcessTemplatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
