import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class ConfigObjectViewsV2Scope1710000000010
  implements MigrationInterface
{
  name = 'ConfigObjectViewsV2Scope1710000000010';

  private async hasIndex(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<boolean> {
    const table = await queryRunner.getTable(tableName);
    if (!table) {
      return false;
    }
    return table.indices.some((index) => index.name === indexName);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'config_object_views';

    if (!(await queryRunner.hasColumn(tableName, 'tenant_id'))) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'tenant_id',
          type: 'bigint',
          unsigned: true,
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn(tableName, 'is_active'))) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'is_active',
          type: 'tinyint',
          unsigned: true,
          isNullable: false,
          default: '1',
        }),
      );
    }

    if (!(await queryRunner.hasColumn(tableName, 'tenant_scope_id'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\`
        ADD COLUMN \`tenant_scope_id\` BIGINT UNSIGNED
        GENERATED ALWAYS AS (IFNULL(\`tenant_id\`, 0)) STORED
      `);
    }

    if (!(await queryRunner.hasColumn(tableName, 'config_json'))) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'config_json',
          type: 'json',
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn(tableName, 'created_by'))) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'created_by',
          type: 'bigint',
          unsigned: true,
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn(tableName, 'updated_by'))) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'updated_by',
          type: 'bigint',
          unsigned: true,
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn(tableName, 'created_at'))) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'created_at',
          type: 'datetime',
          precision: 6,
          isNullable: false,
          default: 'CURRENT_TIMESTAMP(6)',
        }),
      );
    }

    if (!(await queryRunner.hasColumn(tableName, 'updated_at'))) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'updated_at',
          type: 'datetime',
          precision: 6,
          isNullable: false,
          default: 'CURRENT_TIMESTAMP(6)',
          onUpdate: 'CURRENT_TIMESTAMP(6)',
        }),
      );
    }

    if (!(await this.hasIndex(queryRunner, tableName, 'idx_config_object_views_tenant'))) {
      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          name: 'idx_config_object_views_tenant',
          columnNames: ['tenant_id'],
        }),
      );
    }

    if (
      !(await this.hasIndex(
        queryRunner,
        tableName,
        'uq_config_object_views_active_scope',
      ))
    ) {
      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          name: 'uq_config_object_views_active_scope',
          isUnique: true,
          columnNames: [
            'config_object_id',
            'tenant_scope_id',
            'view_type',
            'is_active',
          ],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'config_object_views';

    if (
      await this.hasIndex(
        queryRunner,
        tableName,
        'uq_config_object_views_active_scope',
      )
    ) {
      await queryRunner.dropIndex(tableName, 'uq_config_object_views_active_scope');
    }

    if (
      await this.hasIndex(queryRunner, tableName, 'idx_config_object_views_tenant')
    ) {
      await queryRunner.dropIndex(tableName, 'idx_config_object_views_tenant');
    }

    if (await queryRunner.hasColumn(tableName, 'updated_at')) {
      await queryRunner.dropColumn(tableName, 'updated_at');
    }
    if (await queryRunner.hasColumn(tableName, 'created_at')) {
      await queryRunner.dropColumn(tableName, 'created_at');
    }
    if (await queryRunner.hasColumn(tableName, 'updated_by')) {
      await queryRunner.dropColumn(tableName, 'updated_by');
    }
    if (await queryRunner.hasColumn(tableName, 'created_by')) {
      await queryRunner.dropColumn(tableName, 'created_by');
    }
    if (await queryRunner.hasColumn(tableName, 'config_json')) {
      await queryRunner.dropColumn(tableName, 'config_json');
    }
    if (await queryRunner.hasColumn(tableName, 'is_active')) {
      await queryRunner.dropColumn(tableName, 'is_active');
    }
    if (await queryRunner.hasColumn(tableName, 'tenant_scope_id')) {
      await queryRunner.dropColumn(tableName, 'tenant_scope_id');
    }
    if (await queryRunner.hasColumn(tableName, 'tenant_id')) {
      await queryRunner.dropColumn(tableName, 'tenant_id');
    }
  }
}
