import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepObjectBindingsController } from './process_template_step_object_bindings.controller';
import { ProcessTemplateStepObjectBindingsService } from './process_template_step_object_bindings.service';

describe('ProcessTemplateStepObjectBindingsController', () => {
  let controller: ProcessTemplateStepObjectBindingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessTemplateStepObjectBindingsController],
      providers: [
        {
          provide: ProcessTemplateStepObjectBindingsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get(ProcessTemplateStepObjectBindingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
