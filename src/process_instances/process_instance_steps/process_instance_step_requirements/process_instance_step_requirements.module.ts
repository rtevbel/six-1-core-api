import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessInstanceStepRequirementsService } from './process_instance_step_requirements.service';
import { ProcessInstanceStepRequirementsController } from './process_instance_step_requirements.controller';
import { ProcessInstanceStepRequirementEntity } from './entities/process_instance_step_requirement.entity';
import { ConfigObjectsModule } from '../../../config_objects/config_objects.module';

/**
 * ProcessInstanceStepRequirementsModule is responsible for managing process instance step requirements.
 * It includes the controller and service for handling operations
 * related to process instance step requirements.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessInstanceStepRequirementEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessInstanceStepRequirementEntity]),
    forwardRef(() => ConfigObjectsModule),
  ],
  controllers: [ProcessInstanceStepRequirementsController],
  providers: [ProcessInstanceStepRequirementsService],
  exports: [ProcessInstanceStepRequirementsService],
})
export class ProcessInstanceStepRequirementsModule {}
