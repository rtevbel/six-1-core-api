import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessTemplateStepRequirementsService } from './process_template_step_requirements.service';
import { ProcessTemplateStepRequirementsController } from './process_template_step_requirements.controller';
import { ProcessTemplateStepRequirementEntity } from './entities/process_template_step_requirement.entity';
import { ConfigObjectsModule } from '../../../config_objects/config_objects.module';
import { ProcessTemplateStepObjectBindingEntity } from '../process_template_step_object_bindings/entities/process_template_step_object_binding.entity';
import { ConfigObjectEntity } from '../../../config_objects/entities/config_object.entity';
import { ConfigObjectFieldEntity } from '../../../config_objects/entities/config_object_field.entity';
import { AutomationModule } from '../../../automation/automation.module';

/**
 * ProcessTemplateStepRequirementsModule is responsible for managing process template step requirements.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcessTemplateStepRequirementEntity,
      ProcessTemplateStepObjectBindingEntity,
      ConfigObjectEntity,
      ConfigObjectFieldEntity,
    ]),
    ConfigObjectsModule,
    forwardRef(() => AutomationModule),
  ],
  controllers: [ProcessTemplateStepRequirementsController],
  providers: [ProcessTemplateStepRequirementsService],
  exports: [ProcessTemplateStepRequirementsService],
})
export class ProcessTemplateStepRequirementsModule {}
