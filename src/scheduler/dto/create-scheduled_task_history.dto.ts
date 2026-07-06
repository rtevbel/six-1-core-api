import { IsNotEmpty, IsNumber, IsObject } from 'class-validator';

export class CreateScheduledTaskHistoryDto {
  @IsNumber()
  @IsNotEmpty()
  scheduledTaskId!: number;

  @IsNumber()
  @IsNotEmpty()
  version!: number;

  @IsObject()
  @IsNotEmpty()
  snapshot!: object;
}
