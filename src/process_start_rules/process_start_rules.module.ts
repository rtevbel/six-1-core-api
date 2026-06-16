import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessStartRuleEntity } from './entities/process_start_rule.entity';
import { ProcessStartRulesService } from './process_start_rules.service';
import { ProcessStartRulesController } from './process_start_rules.controller';
import { ProcessTemplateEntity } from '../process_templates/entities/process_template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProcessStartRuleEntity, ProcessTemplateEntity]),
  ],
  controllers: [ProcessStartRulesController],
  providers: [ProcessStartRulesService],
  exports: [ProcessStartRulesService],
})
export class ProcessStartRulesModule {}
