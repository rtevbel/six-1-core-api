import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional } from 'class-validator';
import { CreateProcessStartRuleDto } from './create-process_start_rule.dto';

export class UpdateProcessStartRuleDto extends PartialType(
  CreateProcessStartRuleDto,
) {
  @IsNumber()
  @IsOptional()
  tenantId?: number;
}
