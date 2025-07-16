import { Test, TestingModule } from '@nestjs/testing';
import { SystemLanguagesService } from './system_languages.service';

describe('SystemLanguagesService', () => {
  let service: SystemLanguagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemLanguagesService],
    }).compile();

    service = module.get<SystemLanguagesService>(SystemLanguagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
