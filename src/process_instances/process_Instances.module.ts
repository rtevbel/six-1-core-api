import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessInstancesService } from './process_instances.service';
import { ProcessRunnerService } from './process-runner.service';
import { ProcessInstancesController } from './process_instances.controller';
import { ProcessInstanceStepsModule } from './process_instance_steps/process_instance_steps.module';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { ConfigObjectsModule } from '../config_objects/config_objects.module';
import { AutomationModule } from '../automation/automation.module';

/**
 * ProcessInstancesModule is responsible for managing process instances.
 * It includes the controller and service for handling operations
 * related to process instances and integrates various submodules for process instance management.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessInstanceEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessInstanceEntity]),
    ProcessInstanceStepsModule, // Module for managing process instance steps
    ConfigObjectsModule,
    AutomationModule,
  ],
  controllers: [ProcessInstancesController],
  providers: [ProcessInstancesService, ProcessRunnerService],
  exports: [ProcessInstancesService, ProcessRunnerService],
})
export class ProcessInstancesModule {}
