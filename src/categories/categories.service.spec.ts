import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoryEntity } from './entities/category.entity';
import { CategoryDescriptionEntity } from './entities/category-description.entity';
import { RpcException } from '@nestjs/microservices';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockCategoryRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    metadata: {
      findColumnWithPropertyName: jest.fn((name: string) =>
        name ? { propertyName: name } : undefined,
      ),
    },
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    findOneByOrFail: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockDescriptionRepository = {
    find: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(CategoryEntity),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(CategoryDescriptionEntity),
          useValue: mockDescriptionRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('applies structured core filters and loads descriptions in list order', async () => {
      const bare = [{ categoryId: 5 }] as CategoryEntity[];
      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([bare, 1]);
      mockCategoryRepository.find.mockResolvedValueOnce([
        { categoryId: 5, descriptions: [] },
      ]);

      const result = await service.findAll(1, {
        page: 1,
        limit: 10,
        sortBy: 'categoryId',
        sortOrder: 'ASC',
        sortSource: 'core',
        filters: [
          {
            source: 'core',
            field: 'statusId',
            operator: 'in',
            value: [1],
          },
        ],
      } as any);

      expect(mockCategoryRepository.createQueryBuilder).toHaveBeenCalledWith(
        'cat',
      );
      expect(result.items).toHaveLength(1);
      expect(mockCategoryRepository.find).toHaveBeenCalledWith({
        where: { categoryId: expect.anything() },
        relations: ['descriptions'],
      });
    });

    it('throws RpcException when sortSource is meta', async () => {
      await expect(
        service.findAll(1, {
          page: 1,
          limit: 10,
          sortSource: 'meta',
        } as any),
      ).rejects.toBeInstanceOf(RpcException);
      expect(mockQueryBuilder.getManyAndCount).not.toHaveBeenCalled();
    });

    it('throws RpcException when structured filter source is not core', async () => {
      await expect(
        service.findAll(1, {
          page: 1,
          limit: 10,
          filters: [
            {
              source: 'meta',
              field: 'x',
              operator: 'eq',
              value: '1',
            },
          ],
        } as any),
      ).rejects.toBeInstanceOf(RpcException);
      expect(mockQueryBuilder.getManyAndCount).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('loads descriptions relation', async () => {
      const category = {
        categoryId: 3,
        descriptions: [{ categoryDescriptionId: 1, name: 'Test' }],
      };
      mockCategoryRepository.findOne.mockResolvedValue(category);

      const result = await service.findOne(1, 3);

      expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
        where: { categoryId: 3 },
        relations: ['descriptions'],
      });
      expect(result.descriptions).toHaveLength(1);
    });
  });
});
