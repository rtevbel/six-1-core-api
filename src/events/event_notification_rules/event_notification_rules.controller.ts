import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeleteResult, UpdateResult } from 'typeorm';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { EventNotificationRulesService } from './event_notification_rules.service';
import { CreateEventNotificationRuleDto } from './dto/create-event_notification_rule.dto';
import { UpdateEventNotificationRuleDto } from './dto/update-event_notification_rule.dto';
import { FiltersDto } from './dto/filters.dto';
import { EventNotificationRuleEntity } from './entities/event_notification_rule.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  MICROSERVICE_CREATE_EVENT_NOTIFICATION_RULE_PATTERN,
  MICROSERVICE_FIND_ALL_EVENT_NOTIFICATION_RULE_PATTERN,
  MICROSERVICE_FIND_ONE_EVENT_NOTIFICATION_RULE_PATTERN,
  MICROSERVICE_UPDATE_EVENT_NOTIFICATION_RULE_PATTERN,
  MICROSERVICE_REMOVE_EVENT_NOTIFICATION_RULE_PATTERN,
} from './constants';

@Controller('event-notification-rules')
export class EventNotificationRulesController {
  constructor(
    private readonly rulesService: EventNotificationRulesService,
  ) {}

  @MessagePattern(MICROSERVICE_CREATE_EVENT_NOTIFICATION_RULE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  createEventNotificationRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateEventNotificationRuleDto,
  ): Promise<EventNotificationRuleEntity> {
    return this.rulesService.create(userId, dto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_EVENT_NOTIFICATION_RULE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  findAllEventNotificationRules(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.rulesService.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_EVENT_NOTIFICATION_RULE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  findOneEventNotificationRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    data: { ruleId: number; tenantId?: number },
  ): Promise<EventNotificationRuleEntity> {
    return this.rulesService.findOne(userId, data.ruleId, data.tenantId);
  }

  @MessagePattern(MICROSERVICE_UPDATE_EVENT_NOTIFICATION_RULE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  updateEventNotificationRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    data: { ruleId: number; update: UpdateEventNotificationRuleDto },
  ): Promise<UpdateResult> {
    return this.rulesService.update(userId, data.ruleId, data.update);
  }

  @MessagePattern(MICROSERVICE_REMOVE_EVENT_NOTIFICATION_RULE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  removeEventNotificationRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    data: { ruleId: number; tenantId?: number },
  ): Promise<DeleteResult> {
    return this.rulesService.remove(userId, data.ruleId, data.tenantId);
  }
}
