import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessTemplateStepAssigneesService } from './process_template_step_assignees.service';
import { ProcessTemplateStepAssigneesController } from './process_template_step_assignees.controller';
import { ProcessTemplateStepAssigneeEntity } from './entities/process_template_step_assignee.entity';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';
import { AutomationModule } from '../../../automation/automation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcessTemplateStepAssigneeEntity,
      ProcessTemplateStepEntity,
    ]),
    forwardRef(() => AutomationModule),
  ],
  controllers: [ProcessTemplateStepAssigneesController],
  providers: [ProcessTemplateStepAssigneesService],
  exports: [ProcessTemplateStepAssigneesService],
})
export class ProcessTemplateStepAssigneesModule {}
