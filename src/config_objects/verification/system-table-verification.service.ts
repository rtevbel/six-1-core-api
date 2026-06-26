import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { UserEntity } from '../../users/entities/user.entity';
import { UserMetaEntity } from '../../users/user-meta/entities/user-meta.entity';
import { EventsService } from '../../events/events.service';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import { generateVerificationToken } from './generate-verification-token.util';
import {
  USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP,
  USER_VERIFICATION_META_KEY_EMAIL_VERIFIED,
  USER_VERIFICATION_META_KEY_EXPIRES_AT,
} from './user-verification.constants';
import type { ConfigObjectVerificationFieldMap } from './config-object-verification.constants';

export interface SystemTableVerificationLookupResult {
  coreId: number;
  record: Record<string, unknown>;
}

export interface IssueSystemTableVerificationTokenResult {
  coreId: number;
  token: string;
  expiresAt: string;
}

function readBooleanMeta(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function serializeBooleanMeta(value: boolean): string {
  return value ? 'true' : 'false';
}

/**
 * system_table verification adapter for platform `user` rows (Phase 6).
 */
@Injectable()
export class SystemTableVerificationService {
  private readonly logger = new Logger(SystemTableVerificationService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserMetaEntity)
    private readonly userMetaRepository: Repository<UserMetaEntity>,
    private readonly eventsService: EventsService,
  ) {}

  supportsObjectType(objectType: string): boolean {
    return objectType === 'user';
  }

  async findByTokenField(
    objectType: string,
    fieldKey: string,
    token: string,
    fieldMap: ConfigObjectVerificationFieldMap,
  ): Promise<SystemTableVerificationLookupResult | null> {
    if (!this.supportsObjectType(objectType) || fieldKey !== fieldMap.tokenField) {
      return null;
    }

    const user = await this.userRepository.findOne({
      where: { activationKey: token },
    });
    if (!user) {
      return null;
    }

    return {
      coreId: user.userId,
      record: await this.buildUserVerificationRecord(user, fieldMap),
    };
  }

  async issueVerificationToken(params: {
    objectType: string;
    coreId: number;
    ttlHours: number;
    fieldMap?: ConfigObjectVerificationFieldMap;
    clearVerifiedBeforeIssue?: boolean;
  }): Promise<IssueSystemTableVerificationTokenResult> {
    const fieldMap = params.fieldMap ?? USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP;
    if (!this.supportsObjectType(params.objectType)) {
      throw new Error(
        `issueVerificationToken is not implemented for object_type: ${params.objectType}`,
      );
    }

    const user = await this.userRepository.findOneByOrFail({
      userId: params.coreId,
    });
    const token = generateVerificationToken();
    const expiresAt = new Date(
      Date.now() + params.ttlHours * 60 * 60 * 1000,
    ).toISOString();

    await this.userRepository.update(user.userId, { activationKey: token });
    await this.upsertUserMeta(
      user.userId,
      USER_VERIFICATION_META_KEY_EXPIRES_AT,
      expiresAt,
    );
    if (params.clearVerifiedBeforeIssue !== false) {
      await this.upsertUserMeta(
        user.userId,
        USER_VERIFICATION_META_KEY_EMAIL_VERIFIED,
        serializeBooleanMeta(false),
      );
    }

    return { coreId: user.userId, token, expiresAt };
  }

  async applyVerificationPatch(params: {
    objectType: string;
    coreId: number;
    set: Record<string, unknown>;
    fieldMap?: ConfigObjectVerificationFieldMap;
  }): Promise<{ record: Record<string, unknown>; changedFields: string[] }> {
    const fieldMap = params.fieldMap ?? USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP;
    if (!this.supportsObjectType(params.objectType)) {
      throw new Error(
        `applyVerificationPatch is not implemented for object_type: ${params.objectType}`,
      );
    }

    const user = await this.userRepository.findOneByOrFail({
      userId: params.coreId,
    });
    const changedFields: string[] = [];
    const userPatch: QueryDeepPartialEntity<UserEntity> = {};

    if (Object.prototype.hasOwnProperty.call(params.set, fieldMap.tokenField)) {
      userPatch.activationKey =
        params.set[fieldMap.tokenField] == null
          ? null
          : String(params.set[fieldMap.tokenField]);
      changedFields.push(fieldMap.tokenField);
    }

    if (Object.prototype.hasOwnProperty.call(params.set, 'status')) {
      const status = Number(params.set.status);
      if (Number.isFinite(status)) {
        userPatch.status = status;
        changedFields.push('status');
      }
    }

    if (Object.keys(userPatch).length) {
      await this.userRepository.update(user.userId, userPatch);
    }

    if (
      Object.prototype.hasOwnProperty.call(params.set, fieldMap.expiresAtField)
    ) {
      const value = params.set[fieldMap.expiresAtField];
      if (value == null) {
        await this.deleteUserMeta(user.userId, fieldMap.expiresAtField);
      } else {
        await this.upsertUserMeta(
          user.userId,
          fieldMap.expiresAtField,
          String(value),
        );
      }
      changedFields.push(fieldMap.expiresAtField);
    }

    if (
      Object.prototype.hasOwnProperty.call(params.set, fieldMap.verifiedField)
    ) {
      const verified = params.set[fieldMap.verifiedField] === true;
      await this.upsertUserMeta(
        user.userId,
        fieldMap.verifiedField,
        serializeBooleanMeta(verified),
      );
      changedFields.push(fieldMap.verifiedField);
    }

    const refreshed = await this.userRepository.findOneByOrFail({
      userId: user.userId,
    });
    const record = await this.buildUserVerificationRecord(refreshed, fieldMap);

    this.eventsService.emit(PLATFORM_EVENT_NAMES.SYSTEM_ENTITY_UPDATED, {
      entity: { entityId: user.userId, entityType: 'user' },
      data: {
        objectType: 'user',
        coreId: user.userId,
        changedFields,
      },
    });

    this.logger.debug(
      `Applied system_table verification patch for user:${user.userId}`,
    );

    return { record, changedFields };
  }

  private async buildUserVerificationRecord(
    user: UserEntity,
    fieldMap: ConfigObjectVerificationFieldMap,
  ): Promise<Record<string, unknown>> {
    const meta = await this.loadUserMetaMap(user.userId);
    const record: Record<string, unknown> = {
      activationKey: user.activationKey,
      status: user.status,
      createdAt: user.createdAt?.toISOString?.() ?? user.createdAt,
      email: user.email,
    };

    const expiresAt = meta[fieldMap.expiresAtField];
    if (expiresAt) {
      record[fieldMap.expiresAtField] = expiresAt;
    } else if (user.createdAt && fieldMap.defaultTtlHours) {
      record[fieldMap.expiresAtField] = new Date(
        user.createdAt.getTime() + fieldMap.defaultTtlHours * 60 * 60 * 1000,
      ).toISOString();
    }

    if (meta[fieldMap.verifiedField] != null) {
      record[fieldMap.verifiedField] = readBooleanMeta(
        meta[fieldMap.verifiedField],
      );
    } else {
      record[fieldMap.verifiedField] =
        user.status === 1 && !user.activationKey;
    }

    return record;
  }

  private async loadUserMetaMap(userId: number): Promise<Record<string, string>> {
    const rows = await this.userMetaRepository.find({
      where: { userId },
    });
    const map: Record<string, string> = {};
    for (const row of rows) {
      if (row.metaValue != null) {
        map[row.metaKey] = row.metaValue;
      }
    }
    return map;
  }

  private async upsertUserMeta(
    userId: number,
    metaKey: string,
    metaValue: string,
  ): Promise<void> {
    const existing = await this.userMetaRepository.findOne({
      where: { userId, metaKey },
    });
    if (existing) {
      await this.userMetaRepository.update(existing.userMetaId, { metaValue });
      return;
    }
    await this.userMetaRepository.save({
      userId,
      metaKey,
      metaValue,
    });
  }

  private async deleteUserMeta(userId: number, metaKey: string): Promise<void> {
    await this.userMetaRepository.delete({ userId, metaKey });
  }
}
