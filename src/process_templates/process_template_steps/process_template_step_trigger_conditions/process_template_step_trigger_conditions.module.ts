import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProcessTemplateStepTriggerConditionsService } from './process_template_step_trigger_conditions.service';
import { ProcessTemplateStepTriggerConditionsController } from './process_template_step_trigger_conditions.controller';

import { ProcessTemplateStepTriggerConditionEntity } from './entities/process_template_step_trigger_condition.entity';
import { ConfigObjectsModule } from '../../../config_objects/config_objects.module';

/**
 * ProcessTemplateStepTriggerConditionsModule is responsible for managing
 * process template step trigger conditions. It includes the controller
 * and service for handling operations related to trigger conditions.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateStepTriggerConditionEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessTemplateStepTriggerConditionEntity]),
    ConfigObjectsModule,
  ],
  controllers: [ProcessTemplateStepTriggerConditionsController],
  providers: [ProcessTemplateStepTriggerConditionsService],
})
export class ProcessTemplateStepTriggerConditionsModule {}
