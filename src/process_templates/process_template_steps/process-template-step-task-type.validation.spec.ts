import { RpcException } from '@nestjs/microservices';
import {
  assertProcessTemplateStepTaskTypeAllowed,
  PROCESS_STEP_TASK_TYPE_CONFIG_OBJECT_DEPRECATED_MESSAGE,
} from './process-template-step-task-type.validation';

describe('assertProcessTemplateStepTaskTypeAllowed', () => {
  it('allows standard task types', () => {
    expect(() => assertProcessTemplateStepTaskTypeAllowed('manual')).not.toThrow();
    expect(() => assertProcessTemplateStepTaskTypeAllowed('automated')).not.toThrow();
    expect(() => assertProcessTemplateStepTaskTypeAllowed('call_process')).not.toThrow();
  });

  it('rejects deprecated config_object', () => {
    expect(() => assertProcessTemplateStepTaskTypeAllowed('config_object')).toThrow(
      RpcException,
    );
    expect(() => assertProcessTemplateStepTaskTypeAllowed('config_object')).toThrow(
      PROCESS_STEP_TASK_TYPE_CONFIG_OBJECT_DEPRECATED_MESSAGE,
    );
  });
});
