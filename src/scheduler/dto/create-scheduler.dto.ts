// Import validation decorators from class-validator
import { IsISO8601, IsInt, IsOptional, IsNumber, Min } from 'class-validator';
// Data Transfer Object (DTO) for scheduling a task window
export class CreateSchedulerDto {
    // Task ID (required, must be an integer)
    @IsInt()
    taskId!: number;
  
    // Task Status ID (required, must be an integer)
    @IsInt()
    taskStatusId!: number;
  
    // Requested start time in ISO 8601 format (required)
    @IsISO8601()
    requestedStartUtc!: string;
  
    // Requested end time in ISO 8601 format (required)
    @IsISO8601()
    requestedEndUtc!: string;
  
    // Optional priority (must be a number, minimum value is 0)
    @IsOptional()
    @IsNumber()
    @Min(0)
    priority?: number;
}