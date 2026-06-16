import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProcessStepLockEntity } from './entities/process_step_lock.entity';

const DEFAULT_LOCK_TTL_MS = 60_000;

@Injectable()
export class ProcessStepLocksService {
  private readonly logger = new Logger(ProcessStepLocksService.name);

  constructor(
    private readonly ds: DataSource,
    @InjectRepository(ProcessStepLockEntity)
    private readonly locksRepo: Repository<ProcessStepLockEntity>,
  ) {}

  async acquire(params: {
    stepInstanceId: number;
    tenantUserId: number;
    ttlMs?: number;
  }): Promise<{ lockHolder: number; lockExpiresAt: string }> {
    const ttlMs = Math.max(5_000, Math.min(params.ttlMs ?? DEFAULT_LOCK_TTL_MS, 10 * 60_000));
    const expiresAt = new Date(Date.now() + ttlMs);

    return this.ds.transaction(async (em) => {
      const [existing] = await em.query(
        `SELECT tenant_user_id, expires_at
           FROM process_step_locks
          WHERE step_instance_id = ?
          LIMIT 1
          FOR UPDATE`,
        [params.stepInstanceId],
      );

      if (!existing) {
        await em.query(
          `INSERT INTO process_step_locks (step_instance_id, tenant_user_id, expires_at, created_at, updated_at)
           VALUES (?, ?, ?, NOW(6), NOW(6))`,
          [params.stepInstanceId, params.tenantUserId, expiresAt],
        );
        return {
          lockHolder: params.tenantUserId,
          lockExpiresAt: expiresAt.toISOString(),
        };
      }

      const currentHolder = Number(existing.tenant_user_id);
      const currentExpires = new Date(String(existing.expires_at));
      const expired = Number.isNaN(currentExpires.getTime()) || currentExpires.getTime() <= Date.now();

      if (currentHolder === params.tenantUserId || expired) {
        await em.query(
          `UPDATE process_step_locks
              SET tenant_user_id = ?,
                  expires_at = ?,
                  updated_at = NOW(6)
            WHERE step_instance_id = ?`,
          [params.tenantUserId, expiresAt, params.stepInstanceId],
        );
        return {
          lockHolder: params.tenantUserId,
          lockExpiresAt: expiresAt.toISOString(),
        };
      }

      throw new RpcException('Step is locked by another user.');
    });
  }

  async heartbeat(params: {
    stepInstanceId: number;
    tenantUserId: number;
    ttlMs?: number;
  }): Promise<{ lockHolder: number; lockExpiresAt: string }> {
    return this.acquire(params);
  }

  async release(params: {
    stepInstanceId: number;
    tenantUserId: number;
  }): Promise<void> {
    await this.ds.transaction(async (em) => {
      const [existing] = await em.query(
        `SELECT tenant_user_id
           FROM process_step_locks
          WHERE step_instance_id = ?
          LIMIT 1
          FOR UPDATE`,
        [params.stepInstanceId],
      );

      if (!existing) {
        return;
      }

      const currentHolder = Number(existing.tenant_user_id);
      if (currentHolder !== params.tenantUserId) {
        throw new RpcException('Step lock is held by another user.');
      }

      await em.query(
        `DELETE FROM process_step_locks WHERE step_instance_id = ?`,
        [params.stepInstanceId],
      );
    });
  }

  async assertCanMutateStep(params: {
    stepInstanceId: number;
    tenantUserId: number | null | undefined;
  }): Promise<void> {
    if (!params.tenantUserId) {
      throw new RpcException('tenantUserId is required for step mutation while locks are enabled.');
    }

    const [row] = await this.ds.query(
      `SELECT tenant_user_id, expires_at
         FROM process_step_locks
        WHERE step_instance_id = ?
        LIMIT 1`,
      [params.stepInstanceId],
    );

    if (!row) {
      return;
    }

    const expiresAt = new Date(String(row.expires_at));
    const expired = Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now();
    if (expired) {
      return;
    }

    const holder = Number(row.tenant_user_id);
    if (holder !== params.tenantUserId) {
      throw new RpcException('Step is locked by another user.');
    }
  }

  async loadLocksForStepIds(
    stepIds: number[],
  ): Promise<Map<number, { lockHolder: number; lockExpiresAt: string }>> {
    const map = new Map<number, { lockHolder: number; lockExpiresAt: string }>();
    if (!stepIds.length) {
      return map;
    }

    const rows = await this.ds.query(
      `SELECT step_instance_id, tenant_user_id, expires_at
         FROM process_step_locks
        WHERE step_instance_id IN (${stepIds.map(() => '?').join(',')})
          AND expires_at > NOW()`,
      stepIds,
    );

    for (const row of rows) {
      const stepInstanceId = Number(row.step_instance_id);
      map.set(stepInstanceId, {
        lockHolder: Number(row.tenant_user_id),
        lockExpiresAt: new Date(String(row.expires_at)).toISOString(),
      });
    }
    return map;
  }

  async resolveStepIdForCustomObjectInstance(
    configCustomObjectInstanceId: number,
  ): Promise<number | null> {
    const [row] = await this.ds.query(
      `SELECT step_instance_id
         FROM process_instance_step_object_instances
        WHERE config_custom_object_instance_id = ?
        LIMIT 1`,
      [configCustomObjectInstanceId],
    );
    return row?.step_instance_id != null ? Number(row.step_instance_id) : null;
  }
}

