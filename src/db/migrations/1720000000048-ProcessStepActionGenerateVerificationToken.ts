import { MigrationInterface, QueryRunner } from 'typeorm';

const ACTION_TYPE_ENUM = `'emit_event','send_notification','update_sor_field','call_webhook','generate_verification_token'`;

/**
 * Extends process step action_type enum for generic email verification (Phase 2).
 */
export class ProcessStepActionGenerateVerificationToken1720000000048
  implements MigrationInterface
{
  name = 'ProcessStepActionGenerateVerificationToken1720000000048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_template_step_actions\`
      MODIFY COLUMN \`action_type\` ENUM(${ACTION_TYPE_ENUM}) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`process_instance_step_actions\`
      MODIFY COLUMN \`action_type\` ENUM(${ACTION_TYPE_ENUM}) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`process_action_execution_log\`
      MODIFY COLUMN \`action_type\` ENUM(${ACTION_TYPE_ENUM}) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const legacyEnum = `'emit_event','send_notification','update_sor_field','call_webhook'`;

    await queryRunner.query(`
      DELETE FROM \`process_action_execution_log\`
      WHERE \`action_type\` = 'generate_verification_token'
    `);
    await queryRunner.query(`
      DELETE FROM \`process_instance_step_actions\`
      WHERE \`action_type\` = 'generate_verification_token'
    `);
    await queryRunner.query(`
      DELETE FROM \`process_template_step_actions\`
      WHERE \`action_type\` = 'generate_verification_token'
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_template_step_actions\`
      MODIFY COLUMN \`action_type\` ENUM(${legacyEnum}) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`process_instance_step_actions\`
      MODIFY COLUMN \`action_type\` ENUM(${legacyEnum}) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`process_action_execution_log\`
      MODIFY COLUMN \`action_type\` ENUM(${legacyEnum}) NOT NULL
    `);
  }
}
