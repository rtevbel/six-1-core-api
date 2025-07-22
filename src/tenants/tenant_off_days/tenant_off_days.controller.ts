import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantOffDaysService } from './tenant_off_days.service';
import { CreateTenantOffDayDto } from './dto/create-tenant_off_day.dto';
import { UpdateTenantOffDayDto } from './dto/update-tenant_off_day.dto';

@Controller()
export class TenantOffDaysController {
  constructor(private readonly tenantOffDaysService: TenantOffDaysService) {}

  @MessagePattern('createTenantOffDay')
  create(@Payload() createTenantOffDayDto: CreateTenantOffDayDto) {
    return this.tenantOffDaysService.create(createTenantOffDayDto);
  }

  @MessagePattern('findAllTenantOffDays')
  findAll() {
    return this.tenantOffDaysService.findAll();
  }

  @MessagePattern('findOneTenantOffDay')
  findOne(@Payload() id: number) {
    return this.tenantOffDaysService.findOne(id);
  }

  @MessagePattern('updateTenantOffDay')
  update(@Payload() updateTenantOffDayDto: UpdateTenantOffDayDto) {
    return this.tenantOffDaysService.update(
      updateTenantOffDayDto.id,
      updateTenantOffDayDto,
    );
  }

  @MessagePattern('removeTenantOffDay')
  remove(@Payload() id: number) {
    return this.tenantOffDaysService.remove(id);
  }
}
