import { Injectable } from '@nestjs/common';
import { CreateTenantOffDayDto } from './dto/create-tenant_off_day.dto';
import { UpdateTenantOffDayDto } from './dto/update-tenant_off_day.dto';

@Injectable()
export class TenantOffDaysService {
  create(createTenantOffDayDto: CreateTenantOffDayDto) {
    return 'This action adds a new tenantOffDay';
  }

  findAll() {
    return `This action returns all tenantOffDays`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tenantOffDay`;
  }

  update(id: number, updateTenantOffDayDto: UpdateTenantOffDayDto) {
    return `This action updates a #${id} tenantOffDay`;
  }

  remove(id: number) {
    return `This action removes a #${id} tenantOffDay`;
  }
}
