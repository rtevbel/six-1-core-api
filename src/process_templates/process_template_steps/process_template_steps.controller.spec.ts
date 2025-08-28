import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepsController } from './process_template_steps.controller';
import { ProcessTemplateStepsService } from './process_template_steps.service';

describe('ProcessTemplateStepsController', () => {
  let controller: ProcessTemplateStepsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessTemplateStepsController],
      providers: [ProcessTemplateStepsService],
    }).compile();

    controller = module.get<ProcessTemplateStepsController>(
      ProcessTemplateStepsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
