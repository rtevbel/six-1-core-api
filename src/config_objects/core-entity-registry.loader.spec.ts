import 'reflect-metadata';

import { DataSource } from 'typeorm';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { UserEntity } from '../users/entities/user.entity';
import {
  loadCoreEntityFromRegistry,
  resolveSinglePrimaryKeyPropertyName,
} from './core-entity-registry.loader';

describe('core-entity-registry.loader', () => {
  const findOne = jest.fn();

  const dataSource = {
    getMetadata: (entityClass: Function) => ({
      primaryColumns: [
        {
          propertyName:
            entityClass === TenantEntity
              ? 'tenantId'
              : entityClass === UserEntity
                ? 'userId'
                : 'id',
        },
      ],
    }),
    getRepository: () => ({ findOne }),
  } as unknown as DataSource;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolveSinglePrimaryKeyPropertyName returns the sole PK column', () => {
    expect(
      resolveSinglePrimaryKeyPropertyName(dataSource, TenantEntity),
    ).toBe('tenantId');
  });

  it('loadCoreEntityFromRegistry loads tenant by canonical object type', async () => {
    const tenant = { tenantId: 12, name: 'Acme' };
    findOne.mockResolvedValue(tenant);

    await expect(
      loadCoreEntityFromRegistry(dataSource, 'tenant', 12),
    ).resolves.toBe(tenant);

    expect(findOne).toHaveBeenCalledWith({ where: { tenantId: 12 } });
  });

  it('loadCoreEntityFromRegistry loads users by table alias', async () => {
    const user = { userId: 3, email: 'a@example.com' };
    findOne.mockResolvedValue(user);

    await expect(
      loadCoreEntityFromRegistry(dataSource, 'users', 3),
    ).resolves.toBe(user);

    expect(findOne).toHaveBeenCalledWith({ where: { userId: 3 } });
  });

  it('returns null for unknown object types', async () => {
    await expect(
      loadCoreEntityFromRegistry(dataSource, 'not_a_real_object_type', 1),
    ).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });
});
