import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';
import {
  DeleteProcessTemplateStepExtensionDto,
  GetProcessTemplateStepExtensionDto,
  UpsertProcessTemplateStepExtensionDto,
} from './dto/process-template-step-extension.dto';
import type { ProcessTemplateStepExtensionResponse } from './process-template-step-extension.types';
import { assertProcessTemplateStepExtensionAllowed } from './process-template-step-extension-access.validation';
import {
  mergeStepExtensionJson,
  parseProcessTemplateStepExtension,
  readStepExtensionView,
} from './process-template-step-extension.validation';

@Injectable()
export class ProcessTemplateStepExtensionsService {
  constructor(
    @InjectRepository(ProcessTemplateStepEntity)
    private readonly stepRepository: Repository<ProcessTemplateStepEntity>,
  ) {}

  async get(
    _userId: number,
    dto: GetProcessTemplateStepExtensionDto,
  ): Promise<ProcessTemplateStepExtensionResponse> {
    const step = await assertProcessTemplateStepExtensionAllowed(
      this.stepRepository,
      dto,
    );

    return {
      processTemplateStepId: step.processTemplateStepId,
      extensions: readStepExtensionView(
        step.stepExtensionsJson,
        step.requiredPermissions,
      ),
    };
  }

  async upsert(
    userId: number,
    dto: UpsertProcessTemplateStepExtensionDto,
  ): Promise<ProcessTemplateStepExtensionResponse> {
    const step = await assertProcessTemplateStepExtensionAllowed(
      this.stepRepository,
      dto,
    );

    const patch = parseProcessTemplateStepExtension(dto.extensions);
    const nextExtensionsJson = mergeStepExtensionJson(
      step.stepExtensionsJson,
      {
        visibleWhen: patch.visibleWhen,
        autoAdvanceWhen: patch.autoAdvanceWhen,
        allowSkip: patch.allowSkip,
        parallelGroupId: patch.parallelGroupId,
        ui: patch.ui,
      },
    );

    step.stepExtensionsJson = Object.keys(nextExtensionsJson).length
      ? nextExtensionsJson
      : null;

    if (patch.requiredPermissions !== undefined) {
      step.requiredPermissions = patch.requiredPermissions;
    }

    step.updatedBy = dto.updatedBy ?? userId;
    const saved = await this.stepRepository.save(step);

    return {
      processTemplateStepId: saved.processTemplateStepId,
      extensions: readStepExtensionView(
        saved.stepExtensionsJson,
        saved.requiredPermissions,
      ),
    };
  }

  async remove(
    _userId: number,
    dto: DeleteProcessTemplateStepExtensionDto,
  ): Promise<ProcessTemplateStepExtensionResponse> {
    const step = await assertProcessTemplateStepExtensionAllowed(
      this.stepRepository,
      dto,
    );

    step.stepExtensionsJson = null;
    const saved = await this.stepRepository.save(step);

    return {
      processTemplateStepId: saved.processTemplateStepId,
      extensions: readStepExtensionView(
        saved.stepExtensionsJson,
        saved.requiredPermissions,
      ),
    };
  }
}
