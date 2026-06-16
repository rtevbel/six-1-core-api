import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessTemplateStepActionsService } from './process_template_step_actions.service';
import { ProcessTemplateStepActionsController } from './process_template_step_actions.controller';
import { ProcessTemplateStepActionEntity } from './entities/process_template_step_action.entity';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';
import { ConfigObjectEntity } from '../../../config_objects/entities/config_object.entity';
import { NotificationTemplateEntity } from '../../../notifications/notification_templates/entities/notification_template.entity';
import { ConfigObjectsModule } from '../../../config_objects/config_objects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcessTemplateStepActionEntity,
      ProcessTemplateStepEntity,
      ConfigObjectEntity,
      NotificationTemplateEntity,
    ]),
    ConfigObjectsModule,
  ],
  controllers: [ProcessTemplateStepActionsController],
  providers: [ProcessTemplateStepActionsService],
  exports: [ProcessTemplateStepActionsService],
})
export class ProcessTemplateStepActionsModule {}
