import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { SystemConfigurationsService } from './system_configurations.service';
import { CreateSystemSettingGroupDto } from './dto/create-system-setting-group.dto';
import { UpdateSystemSettingGroupDto } from './dto/update-system-setting-group.dto';
import { FindSystemSettingGroupsFiltersDto } from './dto/find-system-setting-groups-filters.dto';
import {
  CreateSystemSettingDefinitionDto,
  FindSystemSettingDefinitionsFiltersDto,
  UpdateSystemSettingDefinitionDto,
} from './dto/create-system-setting-definition.dto';
import {
  ClearSystemSettingValueDto,
  FindSystemSettingValuesFiltersDto,
  ResolveSystemSettingsDto,
  SetSystemSettingValueDto,
} from './dto/set-system-setting-value.dto';
import { SystemSettingGroupEntity } from './entities/system-setting-group.entity';
import { SystemSettingDefinitionEntity } from './entities/system-setting-definition.entity';
import {
  FindAllDefinitionsResultInterface,
  FindAllGroupsResultInterface,
  FindSettingValuesResultInterface,
} from './interfaces/findall-result.interface';
import {
  ResolveSystemSettingsResult,
  SystemSettingValueView,
} from './interfaces/setting-value-view.interface';
import {
  MICROSERVICE_CLEAR_SYSTEM_SETTING_VALUE_PATTERN,
  MICROSERVICE_CREATE_SYSTEM_SETTING_DEFINITION_PATTERN,
  MICROSERVICE_CREATE_SYSTEM_SETTING_GROUP_PATTERN,
  MICROSERVICE_FIND_ALL_SYSTEM_SETTING_DEFINITIONS_PATTERN,
  MICROSERVICE_FIND_ALL_SYSTEM_SETTING_GROUPS_PATTERN,
  MICROSERVICE_FIND_ONE_SYSTEM_SETTING_DEFINITION_PATTERN,
  MICROSERVICE_FIND_ONE_SYSTEM_SETTING_GROUP_PATTERN,
  MICROSERVICE_FIND_SYSTEM_SETTING_VALUES_PATTERN,
  MICROSERVICE_REMOVE_SYSTEM_SETTING_DEFINITION_PATTERN,
  MICROSERVICE_REMOVE_SYSTEM_SETTING_GROUP_PATTERN,
  MICROSERVICE_RESOLVE_SYSTEM_SETTINGS_PATTERN,
  MICROSERVICE_SET_SYSTEM_SETTING_VALUE_PATTERN,
  MICROSERVICE_UPDATE_SYSTEM_SETTING_DEFINITION_PATTERN,
  MICROSERVICE_UPDATE_SYSTEM_SETTING_GROUP_PATTERN,
} from './constants';

@Controller('system_configurations')
export class SystemConfigurationsController {
  constructor(
    private readonly systemConfigurationsService: SystemConfigurationsService,
  ) {}

  // ─── Groups ─────────────────────────────────────────────────────────────

  @MessagePattern(MICROSERVICE_CREATE_SYSTEM_SETTING_GROUP_PATTERN)
  @RequirePermissions('settings.manage')
  @UsePipes(AppRpcValidationPipe)
  createGroup(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateSystemSettingGroupDto,
  ): Promise<SystemSettingGroupEntity> {
    return this.systemConfigurationsService.createGroup(userId, dto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_SYSTEM_SETTING_GROUPS_PATTERN)
  @RequirePermissions('settings.read')
  @UsePipes(AppRpcValidationPipe)
  findAllGroups(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filters: FindSystemSettingGroupsFiltersDto,
  ): Promise<FindAllGroupsResultInterface> {
    return this.systemConfigurationsService.findAllGroups(userId, filters);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_SYSTEM_SETTING_GROUP_PATTERN)
  @RequirePermissions('settings.read')
  @UsePipes(AppRpcValidationPipe)
  findOneGroup(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) groupId: number,
  ): Promise<SystemSettingGroupEntity> {
    return this.systemConfigurationsService.findOneGroup(userId, groupId);
  }

  @MessagePattern(MICROSERVICE_UPDATE_SYSTEM_SETTING_GROUP_PATTERN)
  @RequirePermissions('settings.manage')
  @UsePipes(AppRpcValidationPipe)
  updateGroup(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateSystemSettingGroupDto,
  ): Promise<SystemSettingGroupEntity> {
    return this.systemConfigurationsService.updateGroup(userId, dto);
  }

  @MessagePattern(MICROSERVICE_REMOVE_SYSTEM_SETTING_GROUP_PATTERN)
  @RequirePermissions('settings.manage')
  @UsePipes(AppRpcValidationPipe)
  removeGroup(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) groupId: number,
  ): Promise<DeleteResult> {
    return this.systemConfigurationsService.removeGroup(userId, groupId);
  }

  // ─── Definitions ────────────────────────────────────────────────────────

  @MessagePattern(MICROSERVICE_CREATE_SYSTEM_SETTING_DEFINITION_PATTERN)
  @RequirePermissions('settings.manage')
  @UsePipes(AppRpcValidationPipe)
  createDefinition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateSystemSettingDefinitionDto,
  ): Promise<SystemSettingDefinitionEntity> {
    return this.systemConfigurationsService.createDefinition(userId, dto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_SYSTEM_SETTING_DEFINITIONS_PATTERN)
  @RequirePermissions('settings.read')
  @UsePipes(AppRpcValidationPipe)
  findAllDefinitions(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filters: FindSystemSettingDefinitionsFiltersDto,
  ): Promise<FindAllDefinitionsResultInterface> {
    return this.systemConfigurationsService.findAllDefinitions(userId, filters);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_SYSTEM_SETTING_DEFINITION_PATTERN)
  @RequirePermissions('settings.read')
  @UsePipes(AppRpcValidationPipe)
  findOneDefinition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) definitionId: number,
  ): Promise<SystemSettingDefinitionEntity> {
    return this.systemConfigurationsService.findOneDefinition(
      userId,
      definitionId,
    );
  }

  @MessagePattern(MICROSERVICE_UPDATE_SYSTEM_SETTING_DEFINITION_PATTERN)
  @RequirePermissions('settings.manage')
  @UsePipes(AppRpcValidationPipe)
  updateDefinition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateSystemSettingDefinitionDto,
  ): Promise<SystemSettingDefinitionEntity> {
    return this.systemConfigurationsService.updateDefinition(userId, dto);
  }

  @MessagePattern(MICROSERVICE_REMOVE_SYSTEM_SETTING_DEFINITION_PATTERN)
  @RequirePermissions('settings.manage')
  @UsePipes(AppRpcValidationPipe)
  removeDefinition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) definitionId: number,
  ): Promise<DeleteResult> {
    return this.systemConfigurationsService.removeDefinition(
      userId,
      definitionId,
    );
  }

  // ─── Values ─────────────────────────────────────────────────────────────

  /**
   * Set global value (`tenantId` omit/0) requires settings.manage.
   * Tenant override requires settings.update (and service enforces overridable).
   * Gateway should send the appropriate permission; both are accepted via manage hierarchy.
   */
  @MessagePattern(MICROSERVICE_SET_SYSTEM_SETTING_VALUE_PATTERN)
  @RequirePermissions('settings.update')
  @UsePipes(AppRpcValidationPipe)
  setValue(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: SetSystemSettingValueDto,
    @Payload('tenantId') tenantId?: number,
    @Payload('tenantUserId') tenantUserId?: number,
  ): Promise<SystemSettingValueView> {
    return this.systemConfigurationsService.setValue(
      userId,
      dto,
      tenantId,
      tenantUserId,
    );
  }

  @MessagePattern(MICROSERVICE_CLEAR_SYSTEM_SETTING_VALUE_PATTERN)
  @RequirePermissions('settings.update')
  @UsePipes(AppRpcValidationPipe)
  clearValue(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ClearSystemSettingValueDto,
    @Payload('tenantId') tenantId?: number,
    @Payload('tenantUserId') tenantUserId?: number,
  ): Promise<DeleteResult> {
    return this.systemConfigurationsService.clearValue(
      userId,
      dto,
      tenantId,
      tenantUserId,
    );
  }

  @MessagePattern(MICROSERVICE_FIND_SYSTEM_SETTING_VALUES_PATTERN)
  @RequirePermissions('settings.read')
  @UsePipes(AppRpcValidationPipe)
  findValues(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filters: FindSystemSettingValuesFiltersDto,
  ): Promise<FindSettingValuesResultInterface> {
    return this.systemConfigurationsService.findValues(userId, filters);
  }

  @MessagePattern(MICROSERVICE_RESOLVE_SYSTEM_SETTINGS_PATTERN)
  @RequirePermissions('settings.read')
  @UsePipes(AppRpcValidationPipe)
  resolve(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ResolveSystemSettingsDto,
  ): Promise<ResolveSystemSettingsResult> {
    return this.systemConfigurationsService.resolve(userId, dto);
  }
}
