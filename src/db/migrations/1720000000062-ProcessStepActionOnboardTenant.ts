import { MigrationInterface, QueryRunner } from 'typeorm';

const ACTION_TYPE_ENUM = `'emit_event','send_notification','update_sor_field','call_webhook','generate_verification_token','onboard_tenant'`;
const LEGACY_ENUM = `'emit_event','send_notification','update_sor_field','call_webhook','generate_verification_token'`;

/**
 * Extends process step action_type enum for tenant registration (HVAC demo pack).
 */
export class ProcessStepActionOnboardTenant1720000000062
  implements MigrationInterface
{
  name = 'ProcessStepActionOnboardTenant1720000000062';

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
    await queryRunner.query(`
      DELETE FROM \`process_action_execution_log\`
      WHERE \`action_type\` = 'onboard_tenant'
    `);
    await queryRunner.query(`
      DELETE FROM \`process_instance_step_actions\`
      WHERE \`action_type\` = 'onboard_tenant'
    `);
    await queryRunner.query(`
      DELETE FROM \`process_template_step_actions\`
      WHERE \`action_type\` = 'onboard_tenant'
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_template_step_actions\`
      MODIFY COLUMN \`action_type\` ENUM(${LEGACY_ENUM}) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`process_instance_step_actions\`
      MODIFY COLUMN \`action_type\` ENUM(${LEGACY_ENUM}) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`process_action_execution_log\`
      MODIFY COLUMN \`action_type\` ENUM(${LEGACY_ENUM}) NOT NULL
    `);
  }
}
