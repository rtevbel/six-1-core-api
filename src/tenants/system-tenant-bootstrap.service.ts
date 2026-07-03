import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ensureSystemTenantRow } from './system-tenant.bootstrap';

/**
 * Ensures `tenants.tenant_id = 0` exists at startup (not during process transactions).
 */
@Injectable()
export class SystemTenantBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SystemTenantBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await ensureSystemTenantRow(this.dataSource.manager);
      this.logger.log('System tenant (tenant_id=0) is ready');
    } catch (error) {
      this.logger.error(
        'Failed to ensure system tenant (tenant_id=0)',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
