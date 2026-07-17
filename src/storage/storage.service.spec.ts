import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { STORAGE_PROVIDER } from './constants';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: STORAGE_PROVIDER,
          useValue: {
            driver: 'local',
            put: jest.fn(),
            delete: jest.fn(),
            head: jest.fn(),
            list: jest.fn(),
            presignUpload: jest.fn(),
            presignGet: jest.fn(),
            createMultipart: jest.fn(),
            presignUploadPart: jest.fn(),
            completeMultipart: jest.fn(),
            abortMultipart: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
