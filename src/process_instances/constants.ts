// PROCESS INSTANCE CONTROLLER MESSAGE PATTERNS
export const MICROSERVICE_CREATE_PROCESS_INSTANCE_PATTERN =
  'v0.1_create_process_instance';
export const MICROSERVICE_FIND_ALL_PROCESS_INSTANCE_PATTERN =
  'v0.1_find_all_process_instances';
export const MICROSERVICE_FIND_ONE_PROCESS_INSTANCE_PATTERN =
  'v0.1_find_one_process_instance';
export const MICROSERVICE_UPDATE_PROCESS_INSTANCE_PATTERN =
  'v0.1_update_process_instance';
export const MICROSERVICE_REMOVE_PROCESS_INSTANCE_PATTERN =
  'v0.1_remove_process_instance';
export const MICROSERVICE_GET_PROCESS_INSTANCE_RUNNER_PATTERN =
  'v0.1_get_process_instance_runner';
export const MICROSERVICE_GET_PROCESS_INSTANCE_TIMELINE_PATTERN =
  'v0.1_get_process_instance_timeline';
export const MICROSERVICE_GET_PROCESS_INSTANCE_STEP_EXECUTION_LOG_PATTERN =
  'v0.1_get_process_instance_step_execution_log';
export const MICROSERVICE_START_PROCESS_PATTERN = 'v0.1_start_process';
export const MICROSERVICE_BATCH_START_PROCESS_PATTERN =
  'v0.1_batch_start_process';
export const MICROSERVICE_ACQUIRE_PROCESS_STEP_LOCK_PATTERN =
  'v0.1_acquire_process_step_lock';
export const MICROSERVICE_RELEASE_PROCESS_STEP_LOCK_PATTERN =
  'v0.1_release_process_step_lock';
export const MICROSERVICE_HEARTBEAT_PROCESS_STEP_LOCK_PATTERN =
  'v0.1_heartbeat_process_step_lock';
export const MICROSERVICE_COMPLETE_PROCESS_INSTANCE_STEP_PATTERN =
  'v0.1_complete_process_instance_step';
export const MICROSERVICE_SKIP_PROCESS_INSTANCE_STEP_PATTERN =
  'v0.1_skip_process_instance_step';
export const MICROSERVICE_RETRY_PROCESS_INSTANCE_STEP_PATTERN =
  'v0.1_retry_process_instance_step';
export const MICROSERVICE_ROLLBACK_PROCESS_INSTANCE_STEP_PATTERN =
  'v0.1_rollback_process_instance_step';

export const MESSAGE_BROKER_PROCESS_INSTANCE_SERVICE_CLIENT_TOKEN =
  'process_instance_service_token';
