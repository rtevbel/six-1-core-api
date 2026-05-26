import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  PROCESS_TEMPLATE_OBJECT_BINDING_MODES,
  type ProcessTemplateObjectBindingMode,
} from '../../../../automation/process-step-object-binding.constants';

export class CreateProcessTemplateStepObjectBindingDto {
  @IsNumber()
  processTemplateStepId!: number;

  @IsNumber()
  configObjectId!: number;

  @IsIn(PROCESS_TEMPLATE_OBJECT_BINDING_MODES)
  bindingMode!: ProcessTemplateObjectBindingMode;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  instanceLabelTemplate?: string | null;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsObject()
  completionRule!: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @IsNumber()
  createdBy!: number;

  @IsOptional()
  @IsNumber()
  updatedBy?: number;
}
