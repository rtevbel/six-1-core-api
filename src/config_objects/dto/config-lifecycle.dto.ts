import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
export { CreateLifecycleDto } from './create-lifecycle.dto';
export { UpdateLifecycleDto } from './update-lifecycle.dto';
export { DeleteLifecycleDto } from './delete-lifecycle.dto';
export { CreateLifecycleTransitionDto } from './create-lifecycle-transition.dto';
export { UpdateLifecycleTransitionDto } from './update-lifecycle-transition.dto';
export { DeleteLifecycleTransitionDto } from './delete-lifecycle-transition.dto';

/**
 * View model for a single allowed lifecycle transition.
 */
export class AllowedTransitionView {
  @IsString()
  toStateKey!: string;

  @IsString()
  @IsOptional()
  rulesJson?: string | null;
}

/**
 * DTO for requesting lifecycle state/allowed transitions for an instance.
 */
export class InstanceLifecycleStateDto {
  @IsInt()
  @Min(1)
  tenantId!: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsInt()
  @Min(1)
  coreId!: number;
}

/**
 * View model returned for an instance's lifecycle state and transitions.
 */
export class InstanceLifecycleStateView {
  @IsString()
  objectType!: string;

  @IsInt()
  coreId!: number;

  @IsInt()
  tenantId!: number;

  @IsString()
  @IsOptional()
  currentLifecycleState?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllowedTransitionView)
  allowedTransitions!: AllowedTransitionView[];
}

