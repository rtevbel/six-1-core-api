import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * CreateTaskDto class.
 *
 * @version 0.0.1
 *
 * Data Transfer Object (DTO) for creating a task.
 * This class defines the structure and validation rules for the data
 * required to create a new task in the system.
 */
export class CreateTaskDto {
  /**
   * Tenant ID (denormalized).
   * Represents the tenant to which the task belongs.
   */
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  tenantId!: number;

  /**
   * Project ID.
   * Identifies the project under which the task is created.
   */
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  projectId!: number;

  /**
   * Task Identifier (optional).
   * A unique identifier for the task, if provided.
   */
  @IsString()
  @IsOptional()
  taskIdentifier?: string;

  /**
   * Task Name.
   * The name or title of the task.
   */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Task Description (optional).
   * A brief description of the task.
   */
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Task Status ID.
   * Represents the current status of the task.
   */
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  taskStatusId!: number;

  /**
   * Process Step Instance ID (optional).
   * Identifies the process step instance associated with the task, if any.
   */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  stepInstanceId?: number;

  /**
   * Task Priority (optional, default: medium).
   * Indicates the priority level of the task.
   */
  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high';

  /**
   * Estimated Duration (optional).
   * The estimated duration of the task in hours, up to 2 decimal places.
   */
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @IsOptional()
  estimatedDuration?: number;

  /**
   * Effort Hours (optional).
   * The estimated effort required for the task in hours, up to 2 decimal places.
   */
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @IsOptional()
  effortHours?: number;

  /**
   * Parent Task ID (optional).
   * Identifies the parent task, if the task is part of a hierarchy.
   */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  parentTaskId?: number;

  /**
   * Status Control.
   * Defines how the task's status is controlled (manual, process, or hybrid).
   */
  @IsEnum(['manual', 'process', 'hybrid'])
  @IsNotEmpty()
  statusControl!: 'manual' | 'process' | 'hybrid';

  /**
   * Scheduling Mode (optional, default: manual).
   * Specifies the scheduling mode for the task.
   */
  @IsEnum(['manual', 'fixed_duration', 'fixed_effort'])
  @IsOptional()
  schedulingMode?: 'manual' | 'fixed_duration' | 'fixed_effort';

  /**
   * Default Shift Hours (optional).
   * The default number of hours per shift for the task, up to 2 decimal places.
   */
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @IsOptional()
  defaultShiftHours?: number;

  /**
   * Primary Assignee ID (optional).
   * Identifies the primary user assigned to the task.
   */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  primaryAssigneeId?: number;

  /**
   * Team ID (optional).
   * Identifies the team responsible for the task.
   */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  teamId?: number;

  /**
   * Start Constraint Type (optional).
   * Specifies the type of constraint applied to the task's start date.
   */
  @IsEnum(['ASAP', 'NoEarlierThan', 'On', 'NoLaterThan', 'MustStartOn', 'MustFinishOn'])
  @IsOptional()
  startConstraintType?: 'ASAP' | 'NoEarlierThan' | 'On' | 'NoLaterThan' | 'MustStartOn' | 'MustFinishOn';

  /**
   * Start Constraint Datetime (optional, UTC).
   * The UTC datetime for the task's start constraint.
   */
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startConstraintUtc?: Date;

  /**
   * Finish Constraint Datetime (optional, UTC).
   * The UTC datetime for the task's finish constraint.
   */
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  finishConstraintUtc?: Date;

  /**
   * Status Locked Until (optional).
   * The datetime until which the task's status is locked.
   */
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  statusLockedUntil?: Date;

  /**
   * Created By.
   * The ID of the user who created the task.
   */
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;

  /**
   * Updated By (optional).
   * The ID of the user who last updated the task.
   */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  updatedBy?: number;
}