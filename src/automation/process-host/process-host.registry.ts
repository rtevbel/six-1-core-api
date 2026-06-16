import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ConfigurableInstanceHostAdapter } from './configurable-instance-host.adapter';
import { GenericWorkflowHostAdapter } from './generic-workflow-host.adapter';
import { SorEntityHostAdapter } from './sor-entity-host.adapter';
import type { ProcessHostAdapter } from './process-host.adapter';
import { ProjectHostAdapter } from './project-host.adapter';
import { ScheduledTaskHostAdapter } from './scheduled-task-host.adapter';

@Injectable()
export class ProcessHostRegistry {
  private readonly byType = new Map<string, ProcessHostAdapter>();

  constructor(
    projectHost: ProjectHostAdapter,
    scheduledTaskHost: ScheduledTaskHostAdapter,
    configurableInstanceHost: ConfigurableInstanceHostAdapter,
    genericWorkflowHost: GenericWorkflowHostAdapter,
    sorEntityHost: SorEntityHostAdapter,
  ) {
    for (const adapter of [
      projectHost,
      scheduledTaskHost,
      configurableInstanceHost,
      genericWorkflowHost,
      sorEntityHost,
    ]) {
      this.byType.set(adapter.subjectType, adapter);
    }
  }

  get(subjectType: string): ProcessHostAdapter {
    const adapter = this.byType.get(subjectType);
    if (!adapter) {
      throw new RpcException(
        `No process host adapter registered for subject_type="${subjectType}"`,
      );
    }
    return adapter;
  }

  has(subjectType: string): boolean {
    return this.byType.has(subjectType);
  }
}
