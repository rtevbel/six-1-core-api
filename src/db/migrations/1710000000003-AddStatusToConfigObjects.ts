import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToConfigObjects1710000000003
  implements MigrationInterface
{
  name = 'AddStatusToConfigObjects1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE config_objects
      ADD COLUMN status ENUM('DRAFT','PUBLISHED','ARCHIVED','CONFLICT')
        NOT NULL DEFAULT 'DRAFT'
        COMMENT 'Lifecycle status of the config object'
        AFTER description
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE config_objects
      DROP COLUMN status
    `);
  }
}

