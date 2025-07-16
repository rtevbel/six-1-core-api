import { Test, TestingModule } from '@nestjs/testing';
import { SystemLanguagesController } from './system_languages.controller';

describe('SystemLanguagesController', () => {
  let controller: SystemLanguagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemLanguagesController],
    }).compile();

    controller = module.get<SystemLanguagesController>(
      SystemLanguagesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
