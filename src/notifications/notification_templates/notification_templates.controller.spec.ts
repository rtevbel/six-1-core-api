import { Test, TestingModule } from '@nestjs/testing';
import { NotificationVariableCatalogService } from '../catalog/notification-variable-catalog.service';
import { NotificationTemplatePreviewService } from '../catalog/notification-template-preview.service';
import { NotificationTemplatesController } from './notification_templates.controller';
import { NotificationTemplatesService } from './notification_templates.service';

describe('NotificationTemplatesController', () => {
  let controller: NotificationTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationTemplatesController],
      providers: [
        {
          provide: NotificationTemplatesService,
          useValue: {},
        },
        {
          provide: NotificationVariableCatalogService,
          useValue: { getCatalog: jest.fn() },
        },
        {
          provide: NotificationTemplatePreviewService,
          useValue: { preview: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<NotificationTemplatesController>(
      NotificationTemplatesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
