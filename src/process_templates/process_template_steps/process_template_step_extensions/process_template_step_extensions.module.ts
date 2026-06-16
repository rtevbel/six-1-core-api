import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';
import { ProcessTemplateStepExtensionsController } from './process_template_step_extensions.controller';
import { ProcessTemplateStepExtensionsService } from './process_template_step_extensions.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessTemplateStepEntity])],
  controllers: [ProcessTemplateStepExtensionsController],
  providers: [ProcessTemplateStepExtensionsService],
  exports: [ProcessTemplateStepExtensionsService],
})
export class ProcessTemplateStepExtensionsModule {}
