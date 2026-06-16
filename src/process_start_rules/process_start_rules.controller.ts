import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeleteResult, UpdateResult } from 'typeorm';
import { RequirePermissions } from '../authorization/authorization.decorator';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { ProcessStartRulesService } from './process_start_rules.service';
import { CreateProcessStartRuleDto } from './dto/create-process_start_rule.dto';
import { UpdateProcessStartRuleDto } from './dto/update-process_start_rule.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessStartRuleEntity } from './entities/process_start_rule.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  MICROSERVICE_CREATE_PROCESS_START_RULE_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_START_RULE_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_START_RULE_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_START_RULE_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_START_RULE_PATTERN,
} from './constants';

@Controller('process-start-rules')
export class ProcessStartRulesController {
  constructor(private readonly rulesService: ProcessStartRulesService) {}

  @MessagePattern(MICROSERVICE_CREATE_PROCESS_START_RULE_PATTERN)
  @RequirePermissions('process_templates.manage')
  @UsePipes(AppRpcValidationPipe)
  createProcessStartRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateProcessStartRuleDto,
  ): Promise<ProcessStartRuleEntity> {
    return this.rulesService.create(userId, dto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_PROCESS_START_RULE_PATTERN)
  @RequirePermissions('process_templates.read')
  @UsePipes(AppRpcValidationPipe)
  findAllProcessStartRules(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.rulesService.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_PROCESS_START_RULE_PATTERN)
  @RequirePermissions('process_templates.read')
  findOneProcessStartRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') data: { ruleId: number; tenantId?: number },
  ): Promise<ProcessStartRuleEntity> {
    return this.rulesService.findOne(userId, data.ruleId, data.tenantId);
  }

  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_START_RULE_PATTERN)
  @RequirePermissions('process_templates.manage')
  @UsePipes(AppRpcValidationPipe)
  updateProcessStartRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') data: { ruleId: number; update: UpdateProcessStartRuleDto },
  ): Promise<UpdateResult> {
    return this.rulesService.update(userId, data.ruleId, data.update);
  }

  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_START_RULE_PATTERN)
  @RequirePermissions('process_templates.manage')
  removeProcessStartRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') data: { ruleId: number; tenantId?: number },
  ): Promise<DeleteResult> {
    return this.rulesService.remove(userId, data.ruleId, data.tenantId);
  }
}
