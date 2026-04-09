import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessTemplatesService } from './process_templates.service';
import { ProcessTemplatesController } from './process_templates.controller';
import { ProcessTemplateStepsModule } from './process_template_steps/process_template_steps.module';
import { ProcessTemplateEntity } from './entities/process_template.entity';
import { ProcessTemplateDescriptionEntity } from './entities/process_template_description.entity';
import { ProcessTemplateCategoryEntity } from './entities/process_template_category.entity';

/**
 * ProcessTemplatesModule is responsible for managing process templates.
 * It includes the controller and service for handling operations
 * related to process templates and integrates various submodules for process template management.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateEntity for TypeORM.
    TypeOrmModule.forFeature([
      ProcessTemplateEntity,
      ProcessTemplateDescriptionEntity,
      ProcessTemplateCategoryEntity,
    ]),
    ProcessTemplateStepsModule, // Module for managing process template steps
  ],
  controllers: [ProcessTemplatesController],
  providers: [ProcessTemplatesService],
  exports: [ProcessTemplatesService],
})
export class ProcessTemplatesModule {}
