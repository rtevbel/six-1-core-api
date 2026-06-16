import { RpcException } from '@nestjs/microservices';
import { PROCESS_STEP_TASK_TYPE_CONFIG_OBJECT } from '../../automation/process-step-task-type.constants';

export const PROCESS_STEP_TASK_TYPE_CONFIG_OBJECT_DEPRECATED_MESSAGE =
  'taskType "config_object" is deprecated. Use a standard task type (manual, automated, call_process) with process_template_step_object_bindings instead.';

/**
 * Rejects deprecated `config_object` step task types on template authoring writes.
 * Existing rows may still read `config_object` until migrated.
 */
export function assertProcessTemplateStepTaskTypeAllowed(
  taskType: string | undefined,
): void {
  if (taskType === PROCESS_STEP_TASK_TYPE_CONFIG_OBJECT) {
    throw new RpcException(PROCESS_STEP_TASK_TYPE_CONFIG_OBJECT_DEPRECATED_MESSAGE);
  }
}
