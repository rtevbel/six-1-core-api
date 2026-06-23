import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes erroneous UNIQUE on process_instances.process_template_id.
 * TypeORM @OneToOne on the same column as @ManyToOne allowed only one instance per template.
 */
export class DropProcessInstanceTemplateUnique1720000000045
  implements MigrationInterface
{
  name = 'DropProcessInstanceTemplateUnique1720000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('process_instances');
    if (!table) {
      return;
    }

    for (const index of table.indices) {
      if (
        index.name &&
        index.isUnique &&
        index.columnNames.length === 1 &&
        index.columnNames[0] === 'process_template_id'
      ) {
        await queryRunner.dropIndex('process_instances', index.name);
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: re-adding UNIQUE would break multi-instance-per-template semantics.
  }
}
