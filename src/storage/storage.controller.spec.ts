import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { MediaService } from './media.service';

describe('StorageController', () => {
  let controller: StorageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: {
            startDirectUpload: jest.fn(),
            confirmDirectUpload: jest.fn(),
            getPresignedDownloadUrl: jest.fn(),
            presignUpload: jest.fn(),
            presignGet: jest.fn(),
          },
        },
        {
          provide: MediaService,
          useValue: {
            startUpload: jest.fn(),
            confirmUpload: jest.fn(),
            presignDownload: jest.fn(),
            deletePaths: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StorageController>(StorageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
