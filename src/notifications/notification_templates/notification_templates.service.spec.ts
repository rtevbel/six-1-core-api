import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationTemplateValidationService } from '../catalog/notification-template-validation.service';
import { NotificationTemplateEntity } from './entities/notification_template.entity';
import { NotificationTemplatesService } from './notification_templates.service';

describe('NotificationTemplatesService', () => {
  let service: NotificationTemplatesService;
  let findAndCount: jest.Mock;
  let findOne: jest.Mock;

  beforeEach(async () => {
    findAndCount = jest.fn();
    findOne = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplatesService,
        {
          provide: getRepositoryToken(NotificationTemplateEntity),
          useValue: {
            save: jest.fn(),
            create: jest.fn((value) => value),
            findAndCount,
            findOne,
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

  describe('findAll', () => {
    it('accepts shared gateway list params including sortSource=core', async () => {
      const template = { templateId: 1, name: 'Welcome' };
      findAndCount.mockResolvedValue([[template], 1]);

      const result = await service.findAll(1, {
        page: 2,
        limit: 10,
        sortBy: 'templateId',
        sortOrder: 'ASC',
        sortSource: 'core',
      });

      expect(findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { templateId: 'ASC' },
          take: 10,
          skip: 10,
        }),
      );
      expect(result.items).toEqual([template]);
    });

    it('throws RpcException when sortSource is meta', async () => {
      await expect(
        service.findAll(1, {
          sortSource: 'meta',
        }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(findAndCount).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns the template when it exists', async () => {
      const template = { templateId: 258, name: 'Invite' };
      findOne.mockResolvedValue(template);

      await expect(service.findById(258)).resolves.toEqual(template);
      expect(findOne).toHaveBeenCalledWith({ where: { templateId: 258 } });
    });

    it('returns null when the template is missing', async () => {
      findOne.mockResolvedValue(null);

      await expect(service.findById(258)).resolves.toBeNull();
    });
  });
});
