import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProcessInstanceStepTriggersService } from './process_instance_step_trigger_conditions.service';
import { ProcessInstanceStepTriggersController } from './process_instance_step_trigger_conditions.controller';

import { ProcessInstanceStepTriggerEntity } from './entities/process_instance_step_trigger_condition.entity';

/**
 * ProcessInstanceStepTriggerConditionsModule is responsible for managing
 * process instance step trigger conditions. It includes the controller
 * and service for handling operations related to trigger conditions.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessInstanceStepTriggerEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessInstanceStepTriggerEntity]),
  ],
  controllers: [ProcessInstanceStepTriggersController],
  providers: [ProcessInstanceStepTriggersService],
})
export class ProcessInstanceStepTriggerConditionsModule {}
