import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessInstanceStepRequirementsService } from './process_instance_step_requirements.service';
import { ProcessInstanceStepRequirementsController } from './process_instance_step_requirements.controller';
import { ProcessInstanceStepRequirementEntity } from './entities/process_instance_step_requirement.entity';

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
  ],
  controllers: [ProcessInstanceStepRequirementsController],
  providers: [ProcessInstanceStepRequirementsService],
  exports: [ProcessInstanceStepRequirementsService],
})
export class ProcessInstanceStepRequirementsModule {}
