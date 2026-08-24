import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigCustomObjectInstanceEntity } from '../config_objects/entities/config_custom_object_instance.entity';
import { ProcessInstanceEntity } from '../process_instances/entities/process_instance.entity';
import { ProcessInstanceStepObjectInstanceEntity } from '../process_instances/process_instance_steps/process_instance_step_object_instances/entities/process_instance_step_object_instance.entity';
import { TenantUsersEntity } from '../tenants/tenant_users/entities/tenant_user.entity';
import { TenantsService } from '../tenants/tenants.service';
import { UserRolesService } from '../users/user-roles/user-roles.service';
import { UserService } from '../users/users.service';
import { TenantEmailVerificationService } from '../users/services/tenant-email-verification.service';
import type { ProcessStepActionEnvelopeParams } from './process-step-action-envelope.util';
import type { OnboardTenantActionConfig } from './process-step-action.types';

const DEFAULT_REGISTRATION_OBJECT_TYPE = 'hvac_tenant_registration';
const ADMIN_ROLE_ID = 2;
const DEFAULT_USER_STATUS = 1;
const DEFAULT_TENANT_STATUS_ID = 1;
const DEFAULT_TENANT_TYPE_ID = 1;

/**
 * Mirrors gateway `OnboardingService.onboardTenant` inside a process step.
 */
@Injectable()
export class ProcessStepOnboardTenantService {
  constructor(
    @InjectRepository(ProcessInstanceStepObjectInstanceEntity)
    private readonly stepObjectRepository: Repository<ProcessInstanceStepObjectInstanceEntity>,
    @InjectRepository(ConfigCustomObjectInstanceEntity)
    private readonly customInstanceRepository: Repository<ConfigCustomObjectInstanceEntity>,
    @InjectRepository(ProcessInstanceEntity)
    private readonly processRepository: Repository<ProcessInstanceEntity>,
    @InjectRepository(TenantUsersEntity)
    private readonly tenantUsersRepository: Repository<TenantUsersEntity>,
    private readonly userService: UserService,
    private readonly userRolesService: UserRolesService,
    private readonly tenantsService: TenantsService,
    private readonly tenantEmailVerification: TenantEmailVerificationService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    config: OnboardTenantActionConfig,
    envelopeParams: ProcessStepActionEnvelopeParams,
  ): Promise<Record<string, unknown>> {
    const existingTenantId = this.readPositiveInt(
      envelopeParams.processContext?.tenantId,
    );
    if (existingTenantId != null) {
      return {
        skipped: true,
        reason: 'tenant_already_in_context',
        tenantId: existingTenantId,
      };
    }

    const payload = await this.loadRegistrationPayload(
      envelopeParams.stepInstanceId,
      config.registrationObjectType?.trim() || DEFAULT_REGISTRATION_OBJECT_TYPE,
    );

    const companyName = this.readRequiredString(payload, [
      'company_name',
      'companyName',
      'tenantName',
    ]);
    const adminEmail = this.readRequiredString(payload, [
      'admin_email',
      'adminEmail',
      'email',
    ]).toLowerCase();
    const adminUsername = this.readRequiredString(payload, [
      'admin_username',
      'adminUsername',
      'username',
    ]);
    const adminFirstName = this.readRequiredString(payload, [
      'admin_first_name',
      'adminFirstName',
      'firstName',
    ]);
    const adminLastName = this.readRequiredString(payload, [
      'admin_last_name',
      'adminLastName',
      'lastName',
    ]);
    const adminPassword = this.readRequiredString(payload, [
      'admin_password',
      'adminPassword',
      'password',
    ]);
    const tenantIdentifier = this.readOptionalString(payload, [
      'tenant_identifier',
      'tenantIdentifier',
    ]);
    const tenantTypeId =
      this.readPositiveInt(payload.tenant_type_id) ??
      this.readPositiveInt(payload.tenantTypeId) ??
      DEFAULT_TENANT_TYPE_ID;
    const tenantStatusId =
      this.readPositiveInt(payload.tenant_status_id) ??
      this.readPositiveInt(payload.tenantStatusId) ??
      DEFAULT_TENANT_STATUS_ID;
    const userStatus =
      this.readPositiveInt(payload.admin_status) ??
      this.readPositiveInt(payload.status) ??
      DEFAULT_USER_STATUS;

    const createdUser = await this.userService.create({
      email: adminEmail,
      username: adminUsername,
      firstName: adminFirstName,
      lastName: adminLastName,
      password: adminPassword,
      displayName: `${adminFirstName} ${adminLastName}`.trim(),
      status: userStatus,
    });

    const ownerUserId = createdUser.userId;
    const systemUserId =
      this.configService.get<number>('SYSTEM_USER_ID') || 1;

    await this.userRolesService.create(systemUserId, {
      userId: ownerUserId,
      roleId: ADMIN_ROLE_ID,
      createdBy: systemUserId,
    });

    const createdTenant = await this.tenantsService.create(systemUserId, {
      name: companyName,
      tenantTypeId,
      tenantIdentifier: tenantIdentifier ?? '',
      userId: ownerUserId,
      statusId: tenantStatusId,
    });

    const tenantId = createdTenant.tenantId;
    await this.ensureOwnerTenantUser(tenantId, ownerUserId);

    try {
      await this.tenantEmailVerification.requestVerification({
        userId: ownerUserId,
        tenantName: companyName,
      });
    } catch {
      // Match gateway onboarding: verification must not block tenant creation.
    }

    const process = await this.processRepository.findOne({
      where: { processInstanceId: envelopeParams.processInstanceId },
    });
    if (!process) {
      throw new Error(
        `Process instance ${envelopeParams.processInstanceId} not found`,
      );
    }

    process.context = {
      ...(process.context ?? {}),
      tenantId,
      ownerUserId,
    };
    await this.processRepository.save(process);

    return {
      tenantId,
      ownerUserId,
      tenantIdentifier: createdTenant.tenantIdentifier,
    };
  }

  private async loadRegistrationPayload(
    stepInstanceId: number,
    objectType: string,
  ): Promise<Record<string, unknown>> {
    const links = await this.stepObjectRepository.find({
      where: { stepInstanceId },
      relations: ['configObject', 'configCustomObjectInstance'],
    });

    const matching = links.find(
      (row) => row.configObject?.objectType === objectType,
    );
    if (!matching) {
      throw new Error(
        `No ${objectType} object binding on step ${stepInstanceId}`,
      );
    }

    const snapshot = matching.payloadSnapshot;
    if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
      return snapshot;
    }

    const instanceId = matching.configCustomObjectInstanceId;
    if (instanceId == null) {
      throw new Error(
        `Registration instance missing for ${objectType} on step ${stepInstanceId}`,
      );
    }

    const instance = await this.customInstanceRepository.findOne({
      where: { configCustomObjectInstanceId: instanceId },
    });
    if (!instance?.payload || typeof instance.payload !== 'object') {
      throw new Error(
        `Registration payload missing for instance ${instanceId}`,
      );
    }

    return instance.payload;
  }

  private async ensureOwnerTenantUser(
    tenantId: number,
    userId: number,
  ): Promise<void> {
    const existing = await this.tenantUsersRepository.findOne({
      where: { tenantId, userId },
    });
    if (existing) {
      return;
    }

    const bootstrap = await this.tenantUsersRepository.find({
      order: { tenantUserId: 'ASC' },
      take: 1,
    });
    const createdBy = bootstrap[0]?.tenantUserId;
    if (createdBy == null) {
      throw new Error(
        'Cannot create tenant_users row — no existing tenant_users for created_by',
      );
    }

    const saved = await this.tenantUsersRepository.save(
      this.tenantUsersRepository.create({
        tenantId,
        userId,
        statusId: DEFAULT_USER_STATUS,
        createdBy,
      }),
    );

    if (saved.createdBy !== saved.tenantUserId) {
      saved.createdBy = saved.tenantUserId;
      await this.tenantUsersRepository.save(saved);
    }
  }

  private readRequiredString(
    payload: Record<string, unknown>,
    keys: string[],
  ): string {
    const value = this.readOptionalString(payload, keys);
    if (!value) {
      throw new Error(
        `Registration payload missing ${keys[0]}`,
      );
    }
    return value;
  }

  private readOptionalString(
    payload: Record<string, unknown>,
    keys: string[],
  ): string | undefined {
    for (const key of keys) {
      const raw = payload[key];
      if (typeof raw === 'string' && raw.trim()) {
        return raw.trim();
      }
    }
    return undefined;
  }

  private readPositiveInt(value: unknown): number | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }
    return Math.trunc(parsed);
  }
}
