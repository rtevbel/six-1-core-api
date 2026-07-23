import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { NO_RECORD_FOUND_MESSAGE } from '../../common/constants';
import {
  getEffectiveTenantId,
  GLOBAL_SYSTEM_TENANT_ID,
} from '../../common/utils/tenant-scope.util';
import { AuthorizationService } from '../../authorization/authorization.service';
import { SystemSettingGroupEntity } from './entities/system-setting-group.entity';
import { SystemSettingDefinitionEntity } from './entities/system-setting-definition.entity';
import { SystemSettingValueEntity } from './entities/system-setting-value.entity';
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
import {
  FindAllDefinitionsResultInterface,
  FindAllGroupsResultInterface,
  FindSettingValuesResultInterface,
} from './interfaces/findall-result.interface';
import {
  ResolveSystemSettingsResult,
  SystemSettingValueView,
} from './interfaces/setting-value-view.interface';
import { SYSTEM_SETTING_SECRET_MASK } from './constants';
import { SecretEncryptionService } from './secret-encryption.service';
import { validateSettingValue } from './validate-setting-value';
import { isSecretBoxPayload } from '../../common/crypto/secret-box.util';

@Injectable()
export class SystemConfigurationsService {
  private readonly logger = new Logger(SystemConfigurationsService.name);

  constructor(
    @InjectRepository(SystemSettingGroupEntity)
    private readonly groupsRepository: Repository<SystemSettingGroupEntity>,
    @InjectRepository(SystemSettingDefinitionEntity)
    private readonly definitionsRepository: Repository<SystemSettingDefinitionEntity>,
    @InjectRepository(SystemSettingValueEntity)
    private readonly valuesRepository: Repository<SystemSettingValueEntity>,
    private readonly secretEncryption: SecretEncryptionService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  // ─── Groups ───────────────────────────────────────────────────────────────

  async createGroup(
    userId: number,
    dto: CreateSystemSettingGroupDto,
  ): Promise<SystemSettingGroupEntity> {
    this.assertGlobalScopeOnly(null, 'create setting groups');
    const entity = this.groupsRepository.create({
      groupKey: dto.groupKey,
      label: dto.label,
      description: dto.description ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      createdBy: userId,
      updatedBy: userId,
    });
    return this.groupsRepository.save(entity);
  }

  async findAllGroups(
    _userId: number,
    filters: FindSystemSettingGroupsFiltersDto,
  ): Promise<FindAllGroupsResultInterface> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = Math.min(filters.limit && filters.limit > 0 ? filters.limit : 50, 100);

    const qb = this.groupsRepository
      .createQueryBuilder('g')
      .orderBy('g.sort_order', 'ASC')
      .addOrderBy('g.group_id', 'ASC');

    if (filters.groupKey) {
      qb.andWhere('g.group_key = :groupKey', { groupKey: filters.groupKey });
    }
    if (typeof filters.isActive === 'boolean') {
      qb.andWhere('g.is_active = :isActive', { isActive: filters.isActive });
    }
    if (filters.search) {
      qb.andWhere('(g.group_key LIKE :q OR g.label LIKE :q)', {
        q: `%${filters.search}%`,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    return { items, groups: items, page, limit, total, totalPages };
  }

  async findOneGroup(
    _userId: number,
    groupId: number,
  ): Promise<SystemSettingGroupEntity> {
    const group = await this.groupsRepository.findOne({ where: { groupId } });
    if (!group) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          SystemSettingGroupEntity.name,
        ),
      );
    }
    return group;
  }

  async updateGroup(
    userId: number,
    dto: UpdateSystemSettingGroupDto,
  ): Promise<SystemSettingGroupEntity> {
    this.assertGlobalScopeOnly(null, 'update setting groups');
    const group = await this.findOneGroup(userId, dto.groupId);
    if (dto.groupKey !== undefined) group.groupKey = dto.groupKey;
    if (dto.label !== undefined) group.label = dto.label;
    if (dto.description !== undefined) group.description = dto.description ?? null;
    if (dto.sortOrder !== undefined) group.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) group.isActive = dto.isActive;
    group.updatedBy = userId;
    return this.groupsRepository.save(group);
  }

  async removeGroup(userId: number, groupId: number): Promise<DeleteResult> {
    this.assertGlobalScopeOnly(null, 'delete setting groups');
    await this.findOneGroup(userId, groupId);
    return this.groupsRepository.delete({ groupId });
  }

  // ─── Definitions ──────────────────────────────────────────────────────────

  async createDefinition(
    userId: number,
    dto: CreateSystemSettingDefinitionDto,
  ): Promise<SystemSettingDefinitionEntity> {
    this.assertGlobalScopeOnly(null, 'create setting definitions');
    await this.findOneGroup(userId, dto.groupId);
    const entity = this.definitionsRepository.create({
      groupId: dto.groupId,
      settingKey: dto.settingKey,
      label: dto.label,
      description: dto.description ?? null,
      valueType: dto.valueType,
      constraintsJson: dto.constraintsJson ?? null,
      defaultValue: dto.defaultValue ?? null,
      isTenantOverridable: dto.isTenantOverridable ?? false,
      isSensitive: dto.isSensitive ?? dto.valueType === 'secret',
      isReadonly: dto.isReadonly ?? false,
      requiresRestart: dto.requiresRestart ?? false,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      createdBy: userId,
      updatedBy: userId,
    });
    return this.definitionsRepository.save(entity);
  }

  async findAllDefinitions(
    _userId: number,
    filters: FindSystemSettingDefinitionsFiltersDto,
  ): Promise<FindAllDefinitionsResultInterface> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = Math.min(filters.limit && filters.limit > 0 ? filters.limit : 50, 100);

    // Resolve groupKey → groupId via groups repo (avoid relation join metadata issues).
    let groupIdFilter = filters.groupId;
    if (filters.groupKey) {
      const group = await this.groupsRepository.findOne({
        where: { groupKey: filters.groupKey },
      });
      if (!group) {
        return {
          items: [],
          definitions: [],
          page,
          limit,
          total: 0,
          totalPages: 1,
        };
      }
      if (groupIdFilter != null && groupIdFilter !== group.groupId) {
        return {
          items: [],
          definitions: [],
          page,
          limit,
          total: 0,
          totalPages: 1,
        };
      }
      groupIdFilter = group.groupId;
    }

    const qb = this.definitionsRepository
      .createQueryBuilder('d')
      .orderBy('d.sort_order', 'ASC')
      .addOrderBy('d.definition_id', 'ASC');

    if (groupIdFilter) {
      qb.andWhere('d.group_id = :groupId', { groupId: groupIdFilter });
    }
    if (filters.settingKey) {
      qb.andWhere('d.setting_key = :settingKey', {
        settingKey: filters.settingKey,
      });
    }
    if (filters.valueType) {
      qb.andWhere('d.value_type = :valueType', { valueType: filters.valueType });
    }
    if (typeof filters.isActive === 'boolean') {
      qb.andWhere('d.is_active = :isActive', { isActive: filters.isActive });
    }
    if (typeof filters.isTenantOverridable === 'boolean') {
      qb.andWhere('d.is_tenant_overridable = :isTenantOverridable', {
        isTenantOverridable: filters.isTenantOverridable,
      });
    }
    if (filters.search) {
      qb.andWhere('(d.setting_key LIKE :q OR d.label LIKE :q)', {
        q: `%${filters.search}%`,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    return { items, definitions: items, page, limit, total, totalPages };
  }

  async findOneDefinition(
    _userId: number,
    definitionId: number,
  ): Promise<SystemSettingDefinitionEntity> {
    const definition = await this.definitionsRepository.findOne({
      where: { definitionId },
      relations: ['group'],
    });
    if (!definition) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          SystemSettingDefinitionEntity.name,
        ),
      );
    }
    return definition;
  }

  async updateDefinition(
    userId: number,
    dto: UpdateSystemSettingDefinitionDto,
  ): Promise<SystemSettingDefinitionEntity> {
    this.assertGlobalScopeOnly(null, 'update setting definitions');
    const definition = await this.findOneDefinition(userId, dto.definitionId);
    if (dto.groupId !== undefined) {
      await this.findOneGroup(userId, dto.groupId);
      definition.groupId = dto.groupId;
    }
    if (dto.label !== undefined) definition.label = dto.label;
    if (dto.description !== undefined) {
      definition.description = dto.description ?? null;
    }
    if (dto.valueType !== undefined) definition.valueType = dto.valueType;
    if (dto.constraintsJson !== undefined) {
      definition.constraintsJson = dto.constraintsJson;
    }
    if (dto.defaultValue !== undefined) definition.defaultValue = dto.defaultValue;
    if (dto.isTenantOverridable !== undefined) {
      definition.isTenantOverridable = dto.isTenantOverridable;
    }
    if (dto.isSensitive !== undefined) definition.isSensitive = dto.isSensitive;
    if (dto.isReadonly !== undefined) definition.isReadonly = dto.isReadonly;
    if (dto.requiresRestart !== undefined) {
      definition.requiresRestart = dto.requiresRestart;
    }
    if (dto.sortOrder !== undefined) definition.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) definition.isActive = dto.isActive;
    definition.updatedBy = userId;
    return this.definitionsRepository.save(definition);
  }

  async removeDefinition(
    userId: number,
    definitionId: number,
  ): Promise<DeleteResult> {
    this.assertGlobalScopeOnly(null, 'delete setting definitions');
    await this.findOneDefinition(userId, definitionId);
    return this.definitionsRepository.delete({ definitionId });
  }

  // ─── Values ───────────────────────────────────────────────────────────────

  async setValue(
    userId: number,
    dto: SetSystemSettingValueDto,
    callerTenantId?: number | null,
    tenantUserId?: number,
  ): Promise<SystemSettingValueView> {
    const definition = await this.resolveDefinitionRef(dto);
    if (!definition.isActive) {
      throw new RpcException('Setting definition is inactive.');
    }
    if (definition.isReadonly) {
      throw new RpcException('Setting is read-only.');
    }

    const targetTenantId = await this.resolveWriteTenantId(
      userId,
      dto.tenantId,
      callerTenantId,
      definition.isTenantOverridable,
      tenantUserId,
    );

    const validated = validateSettingValue(
      definition.valueType,
      dto.value,
      definition.constraintsJson,
    );

    let stored: unknown = validated;
    if (definition.valueType === 'secret') {
      if (typeof validated !== 'string') {
        throw new RpcException('Secret value must be a string.');
      }
      stored = this.secretEncryption.encrypt(validated);
    }

    let row = await this.valuesRepository.findOne({
      where: { definitionId: definition.definitionId, tenantId: targetTenantId },
    });
    if (row) {
      row.valueJson = stored;
      row.updatedBy = userId;
    } else {
      row = this.valuesRepository.create({
        definitionId: definition.definitionId,
        tenantId: targetTenantId,
        valueJson: stored,
        createdBy: userId,
        updatedBy: userId,
      });
    }
    const saved = await this.valuesRepository.save(row);
    this.logger.debug(
      `setValue key=${definition.settingKey} tenantId=${targetTenantId}`,
    );
    return this.toValueView(
      definition,
      saved,
      targetTenantId === GLOBAL_SYSTEM_TENANT_ID ? 'global' : 'tenant_override',
      false,
    );
  }

  async clearValue(
    userId: number,
    dto: ClearSystemSettingValueDto,
    callerTenantId?: number | null,
    tenantUserId?: number,
  ): Promise<DeleteResult> {
    const definition = await this.resolveDefinitionRef(dto);
    const targetTenantId = await this.resolveWriteTenantId(
      userId,
      dto.tenantId,
      callerTenantId,
      definition.isTenantOverridable,
      tenantUserId,
    );
    const result = await this.valuesRepository.delete({
      definitionId: definition.definitionId,
      tenantId: targetTenantId,
    });
    this.logger.debug(
      `clearValue key=${definition.settingKey} tenantId=${targetTenantId} by=${userId}`,
    );
    return result;
  }

  async findValues(
    _userId: number,
    filters: FindSystemSettingValuesFiltersDto,
  ): Promise<FindSettingValuesResultInterface> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = Math.min(
      filters.limit && filters.limit > 0 ? filters.limit : 100,
      200,
    );
    const tenantId =
      typeof filters.tenantId === 'number'
        ? filters.tenantId
        : GLOBAL_SYSTEM_TENANT_ID;

    const qb = this.valuesRepository
      .createQueryBuilder('v')
      .innerJoinAndSelect('v.definition', 'd')
      .leftJoinAndSelect('d.group', 'g')
      .where('v.tenant_id = :tenantId', { tenantId })
      .orderBy('d.sort_order', 'ASC')
      .addOrderBy('v.value_id', 'ASC');

    if (filters.groupId) {
      qb.andWhere('d.group_id = :groupId', { groupId: filters.groupId });
    }
    if (filters.groupKey) {
      qb.andWhere('g.group_key = :groupKey', { groupKey: filters.groupKey });
    }
    if (filters.settingKeys?.length) {
      qb.andWhere('d.setting_key IN (:...settingKeys)', {
        settingKeys: filters.settingKeys,
      });
    }

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const items = rows.map((row) =>
      this.toValueView(
        row.definition,
        row,
        tenantId === GLOBAL_SYSTEM_TENANT_ID ? 'global' : 'tenant_override',
        false,
      ),
    );
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    return { items, values: items, page, limit, total, totalPages };
  }

  /**
   * Resolve effective settings: tenant override → global → definition default.
   */
  async resolve(
    _userId: number,
    dto: ResolveSystemSettingsDto,
  ): Promise<ResolveSystemSettingsResult> {
    const effectiveTenantId = getEffectiveTenantId(dto.tenantId);
    const includeSecrets = dto.includeSecrets === true;

    const qb = this.definitionsRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.group', 'g')
      .where('d.is_active = 1')
      .orderBy('g.sort_order', 'ASC')
      .addOrderBy('d.sort_order', 'ASC');

    if (dto.groupKeys?.length) {
      qb.andWhere('g.group_key IN (:...groupKeys)', {
        groupKeys: dto.groupKeys,
      });
    }
    if (dto.settingKeys?.length) {
      qb.andWhere('d.setting_key IN (:...settingKeys)', {
        settingKeys: dto.settingKeys,
      });
    }

    const definitions = await qb.getMany();
    const definitionIds = definitions.map((d) => d.definitionId);

    const valuesByDef = new Map<number, Map<number, SystemSettingValueEntity>>();
    if (definitionIds.length) {
      const tenantIds = [GLOBAL_SYSTEM_TENANT_ID];
      if (effectiveTenantId !== null) {
        tenantIds.push(effectiveTenantId);
      }
      const rows = await this.valuesRepository
        .createQueryBuilder('v')
        .where('v.definition_id IN (:...definitionIds)', { definitionIds })
        .andWhere('v.tenant_id IN (:...tenantIds)', { tenantIds })
        .getMany();
      for (const row of rows) {
        let byTenant = valuesByDef.get(row.definitionId);
        if (!byTenant) {
          byTenant = new Map();
          valuesByDef.set(row.definitionId, byTenant);
        }
        byTenant.set(row.tenantId, row);
      }
    }

    const groups: ResolveSystemSettingsResult['groups'] = {};
    for (const def of definitions) {
      const groupKey = def.group?.groupKey ?? 'unknown';
      if (!groups[groupKey]) {
        groups[groupKey] = {};
      }
      const byTenant = valuesByDef.get(def.definitionId);
      const tenantRow =
        effectiveTenantId !== null
          ? byTenant?.get(effectiveTenantId)
          : undefined;
      const globalRow = byTenant?.get(GLOBAL_SYSTEM_TENANT_ID);

      let source: SystemSettingValueView['source'] = 'default';
      let row: SystemSettingValueEntity | undefined;
      if (tenantRow) {
        source = 'tenant_override';
        row = tenantRow;
      } else if (globalRow) {
        source = 'global';
        row = globalRow;
      }

      groups[groupKey][def.settingKey] = this.toValueView(
        def,
        row,
        source,
        includeSecrets,
        effectiveTenantId ?? GLOBAL_SYSTEM_TENANT_ID,
      );
    }

    return { tenantId: effectiveTenantId, groups };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async resolveDefinitionRef(ref: {
    definitionId?: number;
    settingKey?: string;
  }): Promise<SystemSettingDefinitionEntity> {
    if (ref.definitionId) {
      return this.findOneDefinition(0, ref.definitionId);
    }
    if (ref.settingKey) {
      const definition = await this.definitionsRepository.findOne({
        where: { settingKey: ref.settingKey },
        relations: ['group'],
      });
      if (!definition) {
        throw new RpcException(
          NO_RECORD_FOUND_MESSAGE.replace(
            '{entity_name}',
            SystemSettingDefinitionEntity.name,
          ),
        );
      }
      return definition;
    }
    throw new RpcException('definitionId or settingKey is required.');
  }

  /**
   * Tenant callers may only write positive tenant overrides for overridable defs.
   * Global writes (tenant 0) require settings.manage.
   */
  private async resolveWriteTenantId(
    userId: number,
    dtoTenantId: number | undefined,
    callerTenantId: number | null | undefined,
    isTenantOverridable: boolean,
    tenantUserId?: number,
  ): Promise<number> {
    const callerEffective = getEffectiveTenantId(callerTenantId);
    const requested =
      typeof dtoTenantId === 'number' ? dtoTenantId : GLOBAL_SYSTEM_TENANT_ID;

    if (callerEffective !== null) {
      if (requested === GLOBAL_SYSTEM_TENANT_ID) {
        throw new RpcException(
          'Tenant admins cannot set global system setting values.',
        );
      }
      if (requested !== callerEffective) {
        throw new RpcException(
          'Tenant admins may only override settings for their own tenant.',
        );
      }
      if (!isTenantOverridable) {
        throw new RpcException('This setting is not tenant-overridable.');
      }
      return requested;
    }

    if (requested === GLOBAL_SYSTEM_TENANT_ID) {
      const canManage = await this.authorizationService.hasPermissions(
        userId,
        ['settings.manage'],
        tenantUserId,
      );
      if (!canManage) {
        throw new RpcException(
          'settings.manage is required to set global system setting values.',
        );
      }
    } else if (!isTenantOverridable) {
      throw new RpcException('This setting is not tenant-overridable.');
    }
    return requested;
  }

  /**
   * Definition/group mutations are platform-owned (super-admin only).
   * Kept as an explicit hook; controller permissions enforce settings.manage.
   */
  private assertGlobalScopeOnly(
    _callerTenantId: number | null,
    _action: string,
  ): void {
    // Permission decorator gates settings.manage; no extra tenant check here.
  }

  private toValueView(
    definition: SystemSettingDefinitionEntity,
    row: SystemSettingValueEntity | undefined,
    source: SystemSettingValueView['source'],
    includeSecrets: boolean,
    fallbackTenantId?: number,
  ): SystemSettingValueView {
    const isSecret = definition.valueType === 'secret' || definition.isSensitive;
    let value: unknown =
      row !== undefined ? row.valueJson : definition.defaultValue;
    let isMasked = false;

    if (source === 'default' && row === undefined) {
      value = definition.defaultValue;
    }

    if (isSecret && value != null) {
      if (includeSecrets && isSecretBoxPayload(value)) {
        value = this.secretEncryption.decrypt(value);
        isMasked = false;
      } else {
        value = SYSTEM_SETTING_SECRET_MASK;
        isMasked = true;
      }
    }

    return {
      definitionId: definition.definitionId,
      settingKey: definition.settingKey,
      groupKey: definition.group?.groupKey ?? '',
      valueType: definition.valueType,
      tenantId: row?.tenantId ?? fallbackTenantId ?? GLOBAL_SYSTEM_TENANT_ID,
      value,
      isSecret: !!isSecret,
      isMasked,
      source,
      valueId: row?.valueId,
      updatedAt: row?.updatedAt,
    };
  }
}
