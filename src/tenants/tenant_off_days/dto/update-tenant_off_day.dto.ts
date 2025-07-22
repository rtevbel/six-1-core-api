import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantOffDayDto } from './create-tenant_off_day.dto';

export class UpdateTenantOffDayDto extends PartialType(CreateTenantOffDayDto) {
  id!: number;
}
