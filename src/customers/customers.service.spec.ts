import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { CustomersService } from './customers.service';
import { CustomerEntity } from './entities/customer.entity';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import * as relatedExists from '../config_objects/list-query/append-related-exists-filter';

type MockQb = {
  leftJoinAndMapOne: jest.Mock;
  leftJoin: jest.Mock;
  andWhere: jest.Mock;
  setParameter: jest.Mock;
  addOrderBy: jest.Mock;
  take: jest.Mock;
  skip: jest.Mock;
  getMany: jest.Mock;
  getCount: jest.Mock;
};

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepository: {
    createQueryBuilder: jest.Mock;
    metadata: {
      findColumnWithPropertyName: jest.Mock;
    };
    manager: { connection: object };
  };
  let configObjectsService: {
    getObjectListFieldCatalog: jest.Mock;
    getObjectSchema: jest.Mock;
  };
  let mainQb: MockQb;
  let countQb: MockQb;
  let qb: MockQb;
  let appendRelatedExistsSpy: jest.SpyInstance;

  beforeEach(async () => {
    const createQb = (): MockQb => ({
      leftJoinAndMapOne: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getCount: jest.fn(),
    });

    mainQb = createQb();
    countQb = createQb();
    mainQb.getMany.mockResolvedValue([{ customerId: 1 }]);
    countQb.getCount.mockResolvedValue(1);
    qb = mainQb;

    customerRepository = {
      createQueryBuilder: jest.fn().mockImplementation(() => {
        const invocation =
          customerRepository.createQueryBuilder.mock.calls.length;
        return invocation % 2 === 1 ? mainQb : countQb;
      }),
      manager: {
        connection: {},
      },
      metadata: {
        findColumnWithPropertyName: jest
          .fn()
          .mockImplementation((fieldKey: string) => {
            if (
              ['customerId', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt'].includes(
                fieldKey,
              )
            ) {
              return { propertyName: fieldKey };
            }
            return null;
          }),
      },
    };

    appendRelatedExistsSpy = jest
      .spyOn(relatedExists, 'appendRelatedExistsFilter')
      .mockImplementation(() => undefined);

    configObjectsService = {
      getObjectListFieldCatalog: jest.fn().mockResolvedValue({
        objectType: 'customer',
        tenantId: null,
        schemaFound: true,
        catalogVersion: 2,
        fields: [
          { fieldKey: 'customerId', source: 'core', fieldType: 'number' },
          { fieldKey: 'email', source: 'core', fieldType: 'text' },
          { fieldKey: 'firstName', source: 'core', fieldType: 'text' },
          { fieldKey: 'lastName', source: 'core', fieldType: 'text' },
          { fieldKey: 'createdAt', source: 'core', fieldType: 'datetime' },
          { fieldKey: 'updatedAt', source: 'core', fieldType: 'datetime' },
          { fieldKey: 'customer_code', source: 'meta', fieldType: 'text' },
          { fieldKey: 'skill_level', source: 'meta', fieldType: 'number' },
          {
            fieldKey: 'phone',
            relationshipKey: 'customer_contact_info',
            source: 'related',
            fieldType: 'text',
          },
        ],
      }),
      getObjectSchema: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: customerRepository,
        },
        {
          provide: ConfigObjectsService,
          useValue: configObjectsService,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    appendRelatedExistsSpy.mockRestore();
  });

  it('scopes customer list to projects of the requested tenant', async () => {
    await service.findAll(1, {
      tenantId: 20,
      page: 1,
      limit: 10,
      sortBy: 'customerId',
      sortOrder: 'DESC',
      sortSource: 'core',
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('customer_project_members'),
      { customerListTenantId: 20 },
    );
  });

  it('applies core filter safely via parameterized clauses', async () => {
    await service.findAll(1, {
      filters: [
        {
          source: 'core',
          field: 'email',
          operator: 'contains',
          value: 'john',
        },
      ],
      page: 1,
      limit: 10,
      sortBy: 'customerId',
      sortOrder: 'DESC',
      sortSource: 'core',
    });

    expect(customerRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
    expect(customerRepository.createQueryBuilder).toHaveBeenCalledWith('c');
    expect(qb.leftJoinAndMapOne).not.toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith(
      'LOWER(c.email) LIKE LOWER(:core_0)',
      {
        core_0: '%john%',
      },
    );
  });

  it('applies createdAt gte/lte with date strings from catalog datetime type', async () => {
    await service.findAll(1, {
      filters: [
        {
          source: 'core',
          field: 'createdAt',
          operator: 'gte',
          value: '2026-01-01',
        },
        {
          source: 'core',
          field: 'createdAt',
          operator: 'lte',
          value: '2026-05-13',
        },
      ],
      page: 1,
      limit: 10,
      sortBy: 'customerId',
      sortOrder: 'ASC',
      sortSource: 'core',
    });

    expect(qb.andWhere).toHaveBeenCalledWith('c.createdAt >= :core_0', {
      core_0: '2026-01-01 00:00:00',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('c.createdAt <= :core_1', {
      core_1: '2026-05-13 23:59:59.999999',
    });
  });

  it('joins meta table and applies meta filter safely', async () => {
    await service.findAll(1, {
      includeMeta: true,
      filters: [
        {
          source: 'meta',
          field: 'customer_code',
          operator: 'eq',
          value: 'CUST-001',
        },
      ],
      page: 1,
      limit: 10,
      sortBy: 'customerId',
      sortOrder: 'DESC',
      sortSource: 'core',
    });

    expect(qb.leftJoinAndMapOne).toHaveBeenCalled();
    expect(qb.setParameter).toHaveBeenCalledWith('metaPath_0', '$.customer_code');
    expect(qb.andWhere).toHaveBeenCalledWith(
      'JSON_UNQUOTE(JSON_EXTRACT(cm.metaJson, :metaPath_0)) = :meta_0',
      {
        meta_0: 'CUST-001',
      },
    );
  });

  it('supports combined core and meta filters in one query', async () => {
    await service.findAll(1, {
      includeMeta: true,
      filters: [
        { source: 'core', field: 'firstName', operator: 'contains', value: 'ali' },
        { source: 'meta', field: 'skill_level', operator: 'gte', value: 5 },
      ],
      page: 1,
      limit: 10,
      sortBy: 'customerId',
      sortOrder: 'DESC',
      sortSource: 'core',
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'LOWER(c.firstName) LIKE LOWER(:core_0)',
      {
        core_0: '%ali%',
      },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'CAST(JSON_UNQUOTE(JSON_EXTRACT(cm.metaJson, :metaPath_1)) AS DECIMAL(20,6)) >= :meta_1',
      {
        meta_1: 5,
      },
    );
  });

  it('joins meta when search is set and catalog lists meta keys', async () => {
    await service.findAll(1, {
      search: 'acme',
      page: 1,
      limit: 10,
      sortBy: 'customerId',
      sortOrder: 'DESC',
      sortSource: 'core',
    });

    expect(qb.leftJoinAndMapOne).toHaveBeenCalled();
    expect(qb.setParameter).toHaveBeenCalledWith('searchMetaPath_0', '$.customer_code');
    expect(qb.setParameter).toHaveBeenCalledWith('searchMetaPath_1', '$.skill_level');
  });

  it('supports meta sorting with parameterized JSON path', async () => {
    await service.findAll(1, {
      includeMeta: true,
      sortSource: 'meta',
      sortBy: 'skill_level',
      sortOrder: 'ASC',
      page: 1,
      limit: 10,
    });

    expect(qb.setParameter).toHaveBeenCalledWith('sortMetaPath', '$.skill_level');
    expect(qb.addOrderBy).toHaveBeenCalledWith(
      'JSON_UNQUOTE(JSON_EXTRACT(cm.metaJson, :sortMetaPath))',
      'ASC',
    );
  });

  it('delegates catalog allowlist resolution to ConfigObjectsService', async () => {
    await service.findAll(1, {
      tenantId: 17,
      filters: [{ source: 'core', field: 'email', operator: 'contains', value: 'x' }],
      page: 1,
      limit: 10,
      sortSource: 'core',
      sortBy: 'customerId',
      sortOrder: 'DESC',
    });

    expect(configObjectsService.getObjectListFieldCatalog).toHaveBeenCalledWith({
      tenantId: 17,
      objectType: 'customer',
    });
  });

  it('delegates related filters via appendRelatedExistsFilter with runner schema relations', async () => {
    configObjectsService.getObjectSchema.mockResolvedValueOnce({
      relations: [
        {
          fromObjectType: 'customer',
          toObjectType: 'customer_contact_info',
          relationshipKey: 'customer_contact_info',
          displayName: 'Contact info',
          cardinality: 'one_to_many',
          relationshipSource: 'designer',
          isActive: true,
          queryConfig: {},
          relationManifestJson: null,
        },
      ],
    });

    await service.findAll(1, {
      filters: [
        {
          source: 'related',
          relationshipKey: 'customer_contact_info',
          field: 'phone',
          operator: 'contains',
          value: '555',
        },
      ],
      page: 1,
      limit: 10,
      sortBy: 'customerId',
      sortOrder: 'DESC',
      sortSource: 'core',
    });

    expect(configObjectsService.getObjectSchema).toHaveBeenCalledWith(null, 'customer');
    expect(appendRelatedExistsSpy).toHaveBeenCalled();
  });

  it('rejects related filters when tenant schema cannot be resolved', async () => {
    configObjectsService.getObjectSchema.mockResolvedValueOnce(null);

    await expect(
      service.findAll(1, {
        filters: [
          {
            source: 'related',
            relationshipKey: 'customer_contact_info',
            field: 'phone',
            operator: 'eq',
            value: '1',
          },
        ],
        page: 1,
        limit: 10,
        sortBy: 'customerId',
        sortOrder: 'DESC',
        sortSource: 'core',
      }),
    ).rejects.toThrow(RpcException);
    expect(appendRelatedExistsSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid field/operator payloads as security guardrails', async () => {
    await expect(
      service.findAll(1, {
        filters: [
          {
            source: 'core',
            field: 'password',
            operator: 'eq',
            value: 'x',
          },
        ],
      } as any),
    ).rejects.toThrow(RpcException);

    await expect(
      service.findAll(1, {
        includeMeta: true,
        filters: [
          {
            source: 'meta',
            field: 'skill_level;DROP_TABLE',
            operator: 'eq',
            value: '10',
          },
        ],
      } as any),
    ).rejects.toThrow(RpcException);

    await expect(
      service.findAll(1, {
        filters: [
          {
            source: 'core',
            field: 'email',
            operator: 'noop',
            value: 'x',
          },
        ],
      } as any),
    ).rejects.toThrow(RpcException);
  });
});
