import { PartialType } from '@nestjs/mapped-types';
import { CreateResourceBlackoutDateDto } from './create-resource-blackout-date.dto';

export class UpdateResourceBlackoutDateDto extends PartialType(
  CreateResourceBlackoutDateDto,
) {}
