import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessTemplateStepRequirementsService } from './process_template_step_requirements.service';
import { ProcessTemplateStepRequirementsController } from './process_template_step_requirements.controller';
import { ProcessTemplateStepRequirementEntity } from './entities/process_template_step_requirement.entity';
import { ConfigObjectsModule } from '../../../config_objects/config_objects.module';

/**
 * ProcessTemplateStepRequirementsModule is responsible for managing process template step requirements.
 * It includes the controller and service for handling operations
 * related to process template step requirements.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateStepRequirementEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessTemplateStepRequirementEntity]),
    ConfigObjectsModule,
  ],
  controllers: [ProcessTemplateStepRequirementsController],
  providers: [ProcessTemplateStepRequirementsService],
})
export class ProcessTemplateStepRequirementsModule {}
