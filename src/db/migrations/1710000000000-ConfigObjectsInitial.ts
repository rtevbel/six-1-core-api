import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConfigObjectsInitial1710000000000 implements MigrationInterface {
  name = 'ConfigObjectsInitial1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_template_sets\` (
        \`config_template_set_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`tenant_id\`              BIGINT UNSIGNED NOT NULL COMMENT 'Tenant that owns this template set',
        \`key\`                    VARCHAR(100) NOT NULL COMMENT 'Stable identifier, e.g. default_core_objects',
        \`name\`                   VARCHAR(255) NOT NULL COMMENT 'Human-readable name',
        \`description\`            TEXT NULL,
        \`status\`                 ENUM('DRAFT','PUBLISHED','ARCHIVED','CONFLICT') NOT NULL DEFAULT 'DRAFT' COMMENT 'Lifecycle status of the template set',
        \`created_by\`             BIGINT UNSIGNED NOT NULL,
        \`updated_by\`             BIGINT UNSIGNED DEFAULT 0,
        \`created_at\`             DATETIME NOT NULL DEFAULT current_timestamp(),
        \`updated_at\`             TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (\`config_template_set_id\`),
        UNIQUE KEY \`uq_template_sets_tenant_key\` (\`tenant_id\`, \`key\`),
        KEY \`idx_template_sets_tenant_id\` (\`tenant_id\`),
        FOREIGN KEY (\`tenant_id\`)  REFERENCES \`tenants\`      (\`tenant_id\`)       ON DELETE CASCADE,
        FOREIGN KEY (\`created_by\`) REFERENCES \`tenant_users\` (\`tenant_user_id\`),
        FOREIGN KEY (\`updated_by\`) REFERENCES \`tenant_users\` (\`tenant_user_id\`)  ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_objects\` (
        \`config_object_id\`        BIGINT UNSIGNED AUTO_INCREMENT,
        \`config_template_set_id\` BIGINT UNSIGNED NOT NULL COMMENT 'Linked template set',
        \`object_type\`            VARCHAR(100) NOT NULL COMMENT 'Logical type key, e.g. project, task, customer',
        \`sor_table_name\`         VARCHAR(255) NOT NULL COMMENT 'System-of-record table backing this object',
        \`display_name\`           VARCHAR(255) NOT NULL COMMENT 'Human readable name',
        \`description\`            TEXT NULL,
        \`is_active\`              TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\`             DATETIME NOT NULL DEFAULT current_timestamp(),
        \`updated_at\`             TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (\`config_object_id\`),
        UNIQUE KEY \`uq_config_object_type_per_template\` (\`config_template_set_id\`, \`object_type\`),
        KEY \`idx_config_objects_template_set_id\` (\`config_template_set_id\`),
        FOREIGN KEY (\`config_template_set_id\`)
          REFERENCES \`config_template_sets\` (\`config_template_set_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_object_fields\` (
        \`config_object_field_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`config_object_id\`       BIGINT UNSIGNED NOT NULL COMMENT 'Linked config object',
        \`field_key\`              VARCHAR(100) NOT NULL COMMENT 'Stable key for the field, used in *_meta JSON',
        \`label\`                  VARCHAR(255) NOT NULL COMMENT 'Human readable label',
        \`description\`            TEXT NULL,
        \`field_type\`             VARCHAR(50) NOT NULL COMMENT 'Primitive type, e.g. text, number, boolean, date, select, json',
        \`validation_json\`        JSON NULL COMMENT 'JSON schema / validation rules',
        \`default_value\`          JSON NULL COMMENT 'Default value in JSON form',
        \`is_required\`            TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
        \`is_system\`              TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'System-managed field that cannot be removed',
        \`order_index\`            INT NOT NULL DEFAULT 0 COMMENT 'Ordering within UI sections',
        \`section_key\`            VARCHAR(100) NULL COMMENT 'Optional section/layout hint',
        \`created_by\`             BIGINT UNSIGNED NOT NULL,
        \`updated_by\`             BIGINT UNSIGNED DEFAULT 0,
        \`created_at\`             DATETIME NOT NULL DEFAULT current_timestamp(),
        \`updated_at\`             TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (\`config_object_field_id\`),
        UNIQUE KEY \`uq_config_field_key_per_object\` (\`config_object_id\`, \`field_key\`),
        KEY \`idx_config_object_fields_object_id\` (\`config_object_id\`),
        FOREIGN KEY (\`config_object_id\`)
          REFERENCES \`config_objects\` (\`config_object_id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`created_by\`)
          REFERENCES \`tenant_users\` (\`tenant_user_id\`),
        FOREIGN KEY (\`updated_by\`)
          REFERENCES \`tenant_users\` (\`tenant_user_id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_object_lifecycles\` (
        \`config_object_lifecycle_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`config_object_id\`           BIGINT UNSIGNED NOT NULL COMMENT 'Linked config object',
        \`state_key\`                  VARCHAR(100) NOT NULL COMMENT 'Machine-readable state key',
        \`label\`                      VARCHAR(255) NOT NULL COMMENT 'Human-readable label',
        \`description\`                TEXT NULL,
        \`order_index\`                INT NOT NULL DEFAULT 0 COMMENT 'Ordering within lifecycle',
        PRIMARY KEY (\`config_object_lifecycle_id\`),
        UNIQUE KEY \`uq_lifecycle_state_per_object\` (\`config_object_id\`, \`state_key\`),
        KEY \`idx_config_object_lifecycles_object_id\` (\`config_object_id\`),
        FOREIGN KEY (\`config_object_id\`)
          REFERENCES \`config_objects\` (\`config_object_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_object_lifecycle_transitions\` (
        \`config_object_lifecycle_transition_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`config_object_id\`                      BIGINT UNSIGNED NOT NULL COMMENT 'Linked config object',
        \`from_state_key\`                        VARCHAR(100) NOT NULL,
        \`to_state_key\`                          VARCHAR(100) NOT NULL,
        \`rules_json\`                            JSON NULL COMMENT 'Transition-specific business rules / conditions',
        PRIMARY KEY (\`config_object_lifecycle_transition_id\`),
        UNIQUE KEY \`uq_lifecycle_transition_per_object\` (\`config_object_id\`, \`from_state_key\`, \`to_state_key\`),
        KEY \`idx_config_object_lifecycle_transitions_object_id\` (\`config_object_id\`),
        FOREIGN KEY (\`config_object_id\`)
          REFERENCES \`config_objects\` (\`config_object_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_object_relationships\` (
        \`config_object_relationship_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`from_object_type\`              VARCHAR(100) NOT NULL COMMENT 'e.g. project',
        \`to_object_type\`                VARCHAR(100) NOT NULL COMMENT 'e.g. task, customer',
        \`relationship_key\`              VARCHAR(100) NOT NULL COMMENT 'Stable relationship key for API/UI',
        \`display_name\`                  VARCHAR(255) NOT NULL COMMENT 'Panel label in UI',
        \`cardinality\`                   ENUM('one_to_many','many_to_one','many_to_many') NOT NULL DEFAULT 'one_to_many',
        \`query_config\`                  JSON NOT NULL COMMENT 'Describes how to fetch related objects',
        \`is_active\`                     TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (\`config_object_relationship_id\`),
        UNIQUE KEY \`uq_relationship_key\` (\`from_object_type\`, \`relationship_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_object_views\` (
        \`config_object_view_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`config_object_id\`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked config object',
        \`view_key\`              VARCHAR(100) NOT NULL COMMENT 'Stable identifier, e.g. list_default, kanban_default',
        \`view_type\`             ENUM('list','board','detail') NOT NULL DEFAULT 'list',
        \`name\`                  VARCHAR(255) NOT NULL COMMENT 'Human-readable name',
        \`description\`           TEXT NULL,
        \`role_key\`              VARCHAR(100) NULL COMMENT 'Optional role scoping token',
        \`is_default\`            TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (\`config_object_view_id\`),
        UNIQUE KEY \`uq_view_key_per_object\` (\`config_object_id\`, \`view_key\`),
        KEY \`idx_config_object_views_object_id\` (\`config_object_id\`),
        FOREIGN KEY (\`config_object_id\`)
          REFERENCES \`config_objects\` (\`config_object_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_object_view_panels\` (
        \`config_object_view_panel_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`config_object_view_id\`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked view',
        \`panel_key\`                  VARCHAR(100) NOT NULL COMMENT 'Stable key for the panel',
        \`title\`                      VARCHAR(255) NOT NULL COMMENT 'Panel title',
        \`panel_type\`                 ENUM('summary','section','related','custom') NOT NULL DEFAULT 'section',
        \`layout_config\`              JSON NULL COMMENT 'Panel-level layout configuration',
        \`order_index\`                INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`config_object_view_panel_id\`),
        UNIQUE KEY \`uq_panel_key_per_view\` (\`config_object_view_id\`, \`panel_key\`),
        KEY \`idx_config_object_view_panels_view_id\` (\`config_object_view_id\`),
        FOREIGN KEY (\`config_object_view_id\`)
          REFERENCES \`config_object_views\` (\`config_object_view_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_object_field_rules\` (
        \`config_object_field_rule_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`config_object_field_id\`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked field',
        \`lifecycle_state_key\`        VARCHAR(100) NULL COMMENT 'Optional lifecycle state key',
        \`role_key\`                   VARCHAR(100) NULL COMMENT 'Optional role key',
        \`is_visible\`                 TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
        \`is_readonly\`                TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
        \`is_required\`                TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
        \`rules_json\`                 JSON NULL COMMENT 'Additional rule metadata',
        PRIMARY KEY (\`config_object_field_rule_id\`),
        KEY \`idx_config_object_field_rules_field_id\` (\`config_object_field_id\`),
        FOREIGN KEY (\`config_object_field_id\`)
          REFERENCES \`config_object_fields\` (\`config_object_field_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_audit_logs\` (
        \`config_audit_log_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`tenant_id\`           BIGINT UNSIGNED NOT NULL,
        \`entity_type\`         VARCHAR(100) NOT NULL COMMENT 'What kind of config entity was changed (object, field, lifecycle, view, relationship, rule)',
        \`entity_id\`           BIGINT UNSIGNED NOT NULL COMMENT 'Primary key of the changed entity',
        \`action\`              ENUM('create','update','delete') NOT NULL,
        \`old_value\`           JSON NULL,
        \`new_value\`           JSON NULL,
        \`changed_by\`          BIGINT UNSIGNED NOT NULL,
        \`changed_at\`          DATETIME NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (\`config_audit_log_id\`),
        KEY \`idx_config_audit_logs_tenant_id\` (\`tenant_id\`),
        KEY \`idx_config_audit_logs_entity\` (\`entity_type\`, \`entity_id\`),
        FOREIGN KEY (\`tenant_id\`)  REFERENCES \`tenants\`      (\`tenant_id\`)       ON DELETE CASCADE,
        FOREIGN KEY (\`changed_by\`) REFERENCES \`tenant_users\` (\`tenant_user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`project_meta\` (
        \`project_meta_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`project_id\`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked project',
        \`meta_json\`       JSON NOT NULL COMMENT 'Dynamic field values keyed by field_key',
        \`created_at\`      DATETIME NOT NULL DEFAULT current_timestamp(),
        \`updated_at\`      TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (\`project_meta_id\`),
        UNIQUE KEY \`uq_project_meta_project_id\` (\`project_id\`),
        FOREIGN KEY (\`project_id\`) REFERENCES \`projects\` (\`project_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`task_meta\` (
        \`task_meta_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`task_id\`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked task',
        \`meta_json\`    JSON NOT NULL COMMENT 'Dynamic field values keyed by field_key',
        \`created_at\`   DATETIME NOT NULL DEFAULT current_timestamp(),
        \`updated_at\`   TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (\`task_meta_id\`),
        UNIQUE KEY \`uq_task_meta_task_id\` (\`task_id\`),
        FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\` (\`task_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`customer_meta\` (
        \`customer_meta_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`customer_id\`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked customer',
        \`meta_json\`        JSON NOT NULL COMMENT 'Dynamic field values keyed by field_key',
        \`created_at\`       DATETIME NOT NULL DEFAULT current_timestamp(),
        \`updated_at\`       TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (\`customer_meta_id\`),
        UNIQUE KEY \`uq_customer_meta_customer_id\` (\`customer_id\`),
        FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`customer_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`customer_contact_info_meta\` (
        \`customer_contact_info_meta_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`customer_contact_id\`           BIGINT UNSIGNED NOT NULL COMMENT 'Linked customer_contact_info',
        \`meta_json\`                     JSON NOT NULL COMMENT 'Dynamic field values keyed by field_key',
        \`created_at\`                    DATETIME NOT NULL DEFAULT current_timestamp(),
        \`updated_at\`                    TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (\`customer_contact_info_meta_id\`),
        UNIQUE KEY \`uq_customer_contact_meta_contact_id\` (\`customer_contact_id\`),
        FOREIGN KEY (\`customer_contact_id\`) REFERENCES \`customer_contact_info\` (\`customer_contact_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_instances\`
        ADD COLUMN \`parent_instance_id\` BIGINT UNSIGNED NULL COMMENT 'Parent process instance'
          AFTER \`process_template_id\`,
        ADD COLUMN \`parent_step_id\` BIGINT UNSIGNED NULL COMMENT 'Parent step that spawned this instance'
          AFTER \`parent_instance_id\`,
        ADD COLUMN \`on_child_failure\` ENUM('ignore','pause_parent','fail_parent') NOT NULL DEFAULT 'pause_parent'
          COMMENT 'Parent behavior when child fails'
          AFTER \`status\`,
        ADD COLUMN \`context\` JSON NULL COMMENT 'Shared instance context JSON'
          AFTER \`correlation_id\`;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_instances\`
        DROP COLUMN \`context\`,
        DROP COLUMN \`on_child_failure\`,
        DROP COLUMN \`parent_step_id\`,
        DROP COLUMN \`parent_instance_id\`;
    `);

    await queryRunner.query('DROP TABLE IF EXISTS `customer_contact_info_meta`;');
    await queryRunner.query('DROP TABLE IF EXISTS `customer_meta`;');
    await queryRunner.query('DROP TABLE IF EXISTS `task_meta`;');
    await queryRunner.query('DROP TABLE IF EXISTS `project_meta`;');
    await queryRunner.query('DROP TABLE IF EXISTS `config_audit_logs`;');
    await queryRunner.query('DROP TABLE IF EXISTS `config_object_field_rules`;');
    await queryRunner.query('DROP TABLE IF EXISTS `config_object_view_panels`;');
    await queryRunner.query('DROP TABLE IF EXISTS `config_object_views`;');
    await queryRunner.query('DROP TABLE IF EXISTS `config_object_relationships`;');
    await queryRunner.query('DROP TABLE IF EXISTS `config_object_lifecycle_transitions`;');
    await queryRunner.query('DROP TABLE IF EXISTS `config_object_lifecycles`;');
    await queryRunner.query('DROP TABLE IF EXISTS `config_object_fields`;');
    await queryRunner.query('DROP TABLE IF EXISTS `config_objects`;');
    await queryRunner.query('DROP TABLE IF EXISTS `config_template_sets`;');
  }
}

