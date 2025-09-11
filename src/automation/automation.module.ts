import { Module } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';

@Module({
  controllers: [AutomationController],
  providers: [AutomationService],
})
export class AutomationModule {}
