import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PROCESS_SUBJECT_TYPES } from '../../automation/process-subject.constants';

export class CreateProcessStartRuleDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventName!: string;

  @IsObject()
  @IsOptional()
  filterJson?: Record<string, unknown> | null;

  @IsNumber()
  templateId!: number;

  @IsIn(PROCESS_SUBJECT_TYPES)
  subjectType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^(workflow_self|[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+)$/)
  subjectIdSource!: string;

  @IsObject()
  @IsOptional()
  contextPatch?: Record<string, unknown> | null;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  createdBy!: number;

  @IsNumber()
  @IsOptional()
  updatedBy?: number;
}
