import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationTemplateValidationService } from '../catalog/notification-template-validation.service';
import { NotificationTemplateEntity } from './entities/notification_template.entity';
import { NotificationTemplatesService } from './notification_templates.service';

describe('NotificationTemplatesService', () => {
  let service: NotificationTemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplatesService,
        {
          provide: getRepositoryToken(NotificationTemplateEntity),
          useValue: {
            save: jest.fn(),
            create: jest.fn((value) => value),
          },
        },
        {
          provide: NotificationTemplateValidationService,
          useValue: {
            validateTemplates: jest.fn().mockResolvedValue({
              referencedPaths: [],
              unknownPaths: [],
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationTemplatesService>(
      NotificationTemplatesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
