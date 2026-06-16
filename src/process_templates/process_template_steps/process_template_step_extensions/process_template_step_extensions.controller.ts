import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RequirePermissions } from '../../../authorization/authorization.decorator';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { ProcessTemplateStepExtensionsService } from './process_template_step_extensions.service';
import {
  DeleteProcessTemplateStepExtensionDto,
  GetProcessTemplateStepExtensionDto,
  UpsertProcessTemplateStepExtensionDto,
} from './dto/process-template-step-extension.dto';
import type { ProcessTemplateStepExtensionResponse } from './process-template-step-extension.types';
import {
  MICROSERVICE_DELETE_PROCESS_TEMPLATE_STEP_EXTENSION_PATTERN,
  MICROSERVICE_GET_PROCESS_TEMPLATE_STEP_EXTENSION_PATTERN,
  MICROSERVICE_UPSERT_PROCESS_TEMPLATE_STEP_EXTENSION_PATTERN,
} from './constants';

@Controller('process-template-step-extensions')
export class ProcessTemplateStepExtensionsController {
  constructor(
    private readonly extensionsService: ProcessTemplateStepExtensionsService,
  ) {}

  @MessagePattern(MICROSERVICE_GET_PROCESS_TEMPLATE_STEP_EXTENSION_PATTERN)
  @RequirePermissions('process_templates.read')
  @UsePipes(AppRpcValidationPipe)
  getProcessTemplateStepExtension(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: GetProcessTemplateStepExtensionDto,
  ): Promise<ProcessTemplateStepExtensionResponse> {
    return this.extensionsService.get(userId, dto);
  }

  @MessagePattern(MICROSERVICE_UPSERT_PROCESS_TEMPLATE_STEP_EXTENSION_PATTERN)
  @RequirePermissions('process_templates.update')
  @UsePipes(AppRpcValidationPipe)
  upsertProcessTemplateStepExtension(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpsertProcessTemplateStepExtensionDto,
  ): Promise<ProcessTemplateStepExtensionResponse> {
    return this.extensionsService.upsert(userId, dto);
  }

  @MessagePattern(MICROSERVICE_DELETE_PROCESS_TEMPLATE_STEP_EXTENSION_PATTERN)
  @RequirePermissions('process_templates.update')
  @UsePipes(AppRpcValidationPipe)
  deleteProcessTemplateStepExtension(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteProcessTemplateStepExtensionDto,
  ): Promise<ProcessTemplateStepExtensionResponse> {
    return this.extensionsService.remove(userId, dto);
  }
}
