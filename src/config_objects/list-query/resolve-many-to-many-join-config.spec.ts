import { DataSource } from 'typeorm';
import { PermissionEntity } from '../../permissions/entities/permission.entity';
import { RolePermissionEntity } from '../../roles/entities/role-permission.entity';
import { RoleEntity } from '../../roles/entities/role.entity';
import {
  resolveManyToManyJoinConfig,
} from './resolve-many-to-many-join-config';

describe('resolveManyToManyJoinConfig', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [RoleEntity, PermissionEntity, RolePermissionEntity],
      synchronize: true,
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('infers role_permissions junction between role and permission', () => {
    const config = resolveManyToManyJoinConfig(dataSource, {
      rootEntityClass: RoleEntity,
      relatedEntityClass: PermissionEntity,
      queryConfig: {},
    });

    expect(config).not.toBeNull();
    expect(config?.joinTable).toBe('role_permissions');
    expect(config?.joinLocalKey).toBe('role_id');
    expect(config?.joinForeignKey).toBe('permission_id');
    expect(config?.targetTable).toBe('permissions');
  });

  it('accepts explicit join_table queryConfig', () => {
    const config = resolveManyToManyJoinConfig(dataSource, {
      rootEntityClass: RoleEntity,
      relatedEntityClass: PermissionEntity,
      queryConfig: {
        join_table: 'role_permissions',
        join_local_key: 'role_id',
        join_foreign_key: 'permission_id',
        target_table: 'permissions',
        target_primary_key: 'permission_id',
      },
    });

    expect(config?.joinTable).toBe('role_permissions');
    expect(config?.joinForeignProperty).toBe('permissionId');
  });
});
