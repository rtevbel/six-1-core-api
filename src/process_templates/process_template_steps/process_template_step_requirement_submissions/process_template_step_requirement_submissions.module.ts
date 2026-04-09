import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessTemplateStepRequirementSubmissionsService } from './process_template_step_requirement_submissions.service';
import { ProcessTemplateStepRequirementSubmissionsController } from './process_template_step_requirement_submissions.controller';
import { ProcessTemplateStepRequirementSubmissionEntity } from './entities/process_template_step_requirement_submission.entity';

/**
 * ProcessTemplateStepRequirementSubmissionsModule is responsible for managing
 * process template step requirement submissions. It includes the controller
 * and service for handling operations related to submissions.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateStepRequirementSubmissionEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessTemplateStepRequirementSubmissionEntity]),
  ],
  controllers: [ProcessTemplateStepRequirementSubmissionsController],
  providers: [ProcessTemplateStepRequirementSubmissionsService],
})
export class ProcessTemplateStepRequirementSubmissionsModule {}
