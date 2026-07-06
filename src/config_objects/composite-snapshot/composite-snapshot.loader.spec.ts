import { DataSource } from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { UserEntity } from '../../users/entities/user.entity';
import {
  loadManyToOneSnapshotsForPrimary,
  serializeEntityRow,
} from './composite-snapshot.loader';

describe('composite-snapshot.loader', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [TenantEntity, TenantUsersEntity, UserEntity],
      synchronize: true,
    });
    await dataSource.initialize();

    await dataSource.getRepository(TenantEntity).save({
      tenantId: 1,
      name: 'Acme',
      statusId: 1,
      tenantTypeId: 1,
      createdBy: 1,
      updatedBy: 1,
    } as TenantEntity);

    await dataSource.getRepository(UserEntity).save({
      userId: 10,
      email: 'admin@example.com',
      password: 'hash',
      statusId: 1,
      createdBy: 1,
      updatedBy: 1,
    } as UserEntity);

    await dataSource.getRepository(TenantUsersEntity).save({
      tenantUserId: 100,
      tenantId: 1,
      userId: 10,
      statusId: 1,
      createdBy: 1,
      updatedBy: 1,
    } as TenantUsersEntity);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('serializes entity rows as plain objects', () => {
    expect(serializeEntityRow({ a: 1, b: 'x' })).toEqual({ a: 1, b: 'x' });
  });

  it('loads user and tenant snapshots for tenant_user primary row', async () => {
    const primary = await dataSource.getRepository(TenantUsersEntity).findOne({
      where: { tenantUserId: 100 },
    });
    expect(primary).not.toBeNull();

    const snapshots = await loadManyToOneSnapshotsForPrimary(
      dataSource,
      TenantUsersEntity,
      primary!,
    );

    expect(snapshots.user).toBeDefined();
    expect((snapshots.user as Record<string, unknown>).email).toBe(
      'admin@example.com',
    );
    expect(snapshots.tenant).toBeDefined();
    expect((snapshots.tenant as Record<string, unknown>).tenantId).toBe(1);
  });
});
