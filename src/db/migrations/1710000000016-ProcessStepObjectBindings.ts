import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Template authoring + runtime linkage for configurable object bindings on process steps.
 */
export class ProcessStepObjectBindings1710000000016
  implements MigrationInterface
{
  name = 'ProcessStepObjectBindings1710000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`process_template_step_object_bindings\` (
        \`binding_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`process_template_step_id\` BIGINT UNSIGNED NOT NULL,
        \`config_object_id\` BIGINT UNSIGNED NOT NULL,
        \`binding_mode\` ENUM('create_on_enter', 'use_existing') NOT NULL DEFAULT 'create_on_enter',
        \`instance_label_template\` VARCHAR(512) NULL,
        \`is_mandatory\` TINYINT NOT NULL DEFAULT 1,
        \`completion_rule\` JSON NOT NULL,
        \`order_index\` INT NOT NULL DEFAULT 0,
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`binding_id\`),
        INDEX \`idx_ptsob_step_order\` (\`process_template_step_id\`, \`order_index\`),
        CONSTRAINT \`fk_ptsob_step\`
          FOREIGN KEY (\`process_template_step_id\`)
          REFERENCES \`process_template_steps\` (\`process_template_step_id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`fk_ptsob_config_object\`
          FOREIGN KEY (\`config_object_id\`)
          REFERENCES \`config_objects\` (\`config_object_id\`)
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`process_instance_step_object_instances\` (
        \`step_object_instance_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`step_instance_id\` BIGINT UNSIGNED NOT NULL,
        \`binding_id\` BIGINT UNSIGNED NULL,
        \`config_object_id\` BIGINT UNSIGNED NOT NULL,
        \`config_custom_object_instance_id\` BIGINT UNSIGNED NULL,
        \`status\` ENUM('pending', 'active', 'valid', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
        \`last_error\` TEXT NULL,
        \`payload_snapshot\` JSON NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`step_object_instance_id\`),
        INDEX \`idx_pisoi_step\` (\`step_instance_id\`),
        INDEX \`idx_pisoi_step_status\` (\`step_instance_id\`, \`status\`),
        CONSTRAINT \`fk_pisoi_step\`
          FOREIGN KEY (\`step_instance_id\`)
          REFERENCES \`process_instance_steps\` (\`step_instance_id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`fk_pisoi_binding\`
          FOREIGN KEY (\`binding_id\`)
          REFERENCES \`process_template_step_object_bindings\` (\`binding_id\`)
          ON DELETE SET NULL,
        CONSTRAINT \`fk_pisoi_config_object\`
          FOREIGN KEY (\`config_object_id\`)
          REFERENCES \`config_objects\` (\`config_object_id\`)
          ON DELETE RESTRICT,
        CONSTRAINT \`fk_pisoi_custom_instance\`
          FOREIGN KEY (\`config_custom_object_instance_id\`)
          REFERENCES \`config_custom_object_instances\` (\`config_custom_object_instance_id\`)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`process_instance_step_object_instances\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`process_template_step_object_bindings\`
    `);
  }
}
