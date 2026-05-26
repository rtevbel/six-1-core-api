import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessTemplateStepObjectBindingsService } from './process_template_step_object_bindings.service';
import { ProcessTemplateStepObjectBindingsController } from './process_template_step_object_bindings.controller';
import { ProcessTemplateStepObjectBindingEntity } from './entities/process_template_step_object_binding.entity';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';
import { ConfigObjectEntity } from '../../../config_objects/entities/config_object.entity';
import { ConfigObjectsModule } from '../../../config_objects/config_objects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcessTemplateStepObjectBindingEntity,
      ProcessTemplateStepEntity,
      ConfigObjectEntity,
    ]),
    ConfigObjectsModule,
  ],
  controllers: [ProcessTemplateStepObjectBindingsController],
  providers: [ProcessTemplateStepObjectBindingsService],
  exports: [ProcessTemplateStepObjectBindingsService],
})
export class ProcessTemplateStepObjectBindingsModule {}
