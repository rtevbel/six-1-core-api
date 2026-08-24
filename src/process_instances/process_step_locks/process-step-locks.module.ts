import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessStepLockEntity } from './entities/process_step_lock.entity';
import { ProcessStepLocksService } from './process-step-locks.service';

/**
 * Isolated step-lock persistence so other modules can use
 * {@link ProcessStepLocksService} without importing ProcessInstancesModule.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ProcessStepLockEntity])],
  providers: [ProcessStepLocksService],
  exports: [ProcessStepLocksService],
})
export class ProcessStepLocksModule {}
