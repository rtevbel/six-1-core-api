import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessTemplatesService } from './process_templates.service';
import { ProcessTemplateEntity } from './entities/process_template.entity';
import { ProcessTemplateDescriptionEntity } from './entities/process_template_description.entity';
import { ProcessTemplateCategoryEntity } from './entities/process_template_category.entity';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { AJV } from '../automation/ajv.module';
import * as catalogExecutor from '../config_objects/list-query/sor-bound-dynamic-list.executor';

describe('ProcessTemplatesService', () => {
  let service: ProcessTemplatesService;

  const processTemplateRepository = {
    create: jest.fn((dto) => dto),
    save: jest.fn(async (entity) => ({
      processTemplateId: 1,
      ...entity,
    })),
    findOne: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessTemplatesService,
        {
          provide: getRepositoryToken(ProcessTemplateEntity),
          useValue: processTemplateRepository,
        },
        {
          provide: getRepositoryToken(ProcessTemplateDescriptionEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ProcessTemplateCategoryEntity),
          useValue: {},
        },
        {
          provide: ConfigObjectsService,
          useValue: {},
        },
        {
          provide: AJV,
          useValue: { compile: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ProcessTemplatesService>(ProcessTemplatesService);
  });

  it('defaults new templates to DRAFT when status is omitted', async () => {
    await service.create(1, {
      tenantId: 10,
      createdBy: 2,
      descriptions: [],
      categories: [],
    });

    expect(processTemplateRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'DRAFT', tenantId: 10 }),
    );
  });

  it('stores tenantId 0 when super-admin omits tenant on create', async () => {
    await service.create(1, {
      createdBy: 2,
      descriptions: [],
      categories: [],
    });

    expect(processTemplateRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 0 }),
    );
  });

  it('findOne without tenantId resolves by template id only (super-admin)', async () => {
    processTemplateRepository.findOne.mockResolvedValueOnce({
      processTemplateId: 9,
      tenantId: 0,
    });

    await service.findOne(1, { processTemplateId: 9 });

    expect(processTemplateRepository.findOne).toHaveBeenCalledWith({
      where: { processTemplateId: 9 },
      relations: expect.any(Array),
    });
  });

  it('findOne with tenantId enforces tenant scope', async () => {
    processTemplateRepository.findOne.mockResolvedValueOnce({
      processTemplateId: 9,
      tenantId: 10,
    });

    await service.findOne(1, { processTemplateId: 9, tenantId: 10 });

    expect(processTemplateRepository.findOne).toHaveBeenCalledWith({
      where: { processTemplateId: 9, tenantId: 10 },
      relations: expect.any(Array),
    });
  });

  it('deactivate without tenantId uses super-admin scope', async () => {
    const template = {
      processTemplateId: 5,
      tenantId: 0,
      status: 'PUBLISHED',
      updatedBy: 0,
    } as ProcessTemplateEntity;

    processTemplateRepository.findOne.mockResolvedValueOnce(template);
    processTemplateRepository.save.mockImplementationOnce(async (row) => row);

    await service.deactivate(99, { processTemplateId: 5 });

    expect(processTemplateRepository.findOne).toHaveBeenCalledWith({
      where: { processTemplateId: 5 },
    });
  });

  it('deactivate sets status to ARCHIVED', async () => {
    const template = {
      processTemplateId: 5,
      tenantId: 10,
      status: 'PUBLISHED',
      updatedBy: 0,
    } as ProcessTemplateEntity;

    processTemplateRepository.findOne.mockResolvedValueOnce(template);
    processTemplateRepository.save.mockImplementationOnce(async (row) => row);

    const result = await service.deactivate(99, {
      processTemplateId: 5,
      tenantId: 10,
      updatedBy: 3,
    });

    expect(result.status).toBe('ARCHIVED');
    expect(result.updatedBy).toBe(3);
  });

  it('deactivate throws when template is missing', async () => {
    processTemplateRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.deactivate(1, { processTemplateId: 999 }),
    ).rejects.toThrow(RpcException);
  });

  it('findAll applies configObjectId binding EXISTS scope', async () => {
    const andWhere = jest.fn().mockReturnThis();
    jest
      .spyOn(catalogExecutor, 'executeCatalogBackedDynamicListQuery')
      .mockImplementation(async (ctx, filters) => {
        ctx.applyMandatoryScope({ andWhere } as any, filters);
        return {
          rows: [{ processTemplateId: 11, status: 'PUBLISHED' }] as any,
          total: 1,
        };
      });

    const result = await service.findAll(1, {
      tenantId: 10,
      status: 'PUBLISHED',
      configObjectId: 20,
      page: 1,
      limit: 10,
    } as any);

    expect(andWhere).toHaveBeenCalledWith(
      '(pt.tenantId = :ptTenantId OR pt.tenantId = 0)',
      { ptTenantId: 10 },
    );
    expect(andWhere).toHaveBeenCalledWith(
      expect.stringContaining('process_template_step_object_bindings'),
      expect.objectContaining({ bindingConfigObjectId: 20 }),
    );
    expect(andWhere).toHaveBeenCalledWith('pt.status = :ptStatus', {
      ptStatus: 'PUBLISHED',
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
