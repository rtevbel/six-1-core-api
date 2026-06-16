import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessInstanceStepRequirementSubmissionsService } from './process_instance_step_requirement_submissions.service';
import { ProcessInstanceStepRequirementSubmissionsController } from './process_instance_step_requirement_submissions.controller';
import { ProcessInstanceStepRequirementSubmissionEntity } from './entities/process_instance_step_requirement_submission.entity';
import { ProcessInstanceStepRequirementsModule } from '../process_instance_step_requirements/process_instance_step_requirements.module';
import { AutomationModule } from '../../../automation/automation.module';
import { ConfigObjectsModule } from '../../../config_objects/config_objects.module';

/**
 * ProcessInstanceStepRequirementSubmissionsModule is responsible for managing
 * process instance step requirement submissions. It includes the controller
 * and service for handling operations related to submissions.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessInstanceStepRequirementSubmissionEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessInstanceStepRequirementSubmissionEntity]),
    forwardRef(() => ProcessInstanceStepRequirementsModule),
    forwardRef(() => AutomationModule),
    forwardRef(() => ConfigObjectsModule),
  ],
  controllers: [ProcessInstanceStepRequirementSubmissionsController],
  providers: [ProcessInstanceStepRequirementSubmissionsService],
})
export class ProcessInstanceStepRequirementSubmissionsModule {}
