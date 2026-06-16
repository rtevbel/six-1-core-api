import { REQUIRED_PERMISSIONS_KEY } from '../../../authorization/constants';
import { ProcessTemplateStepActionsController } from './process_template_step_actions.controller';
import {
  MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
} from './constants';

describe('ProcessTemplateStepActionsController permissions', () => {
  const cases: Array<{
    method: keyof ProcessTemplateStepActionsController;
    pattern: string;
    permissions: string[];
  }> = [
    {
      method: 'createProcessTemplateStepAction',
      pattern: MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
      permissions: ['process_templates.update'],
    },
    {
      method: 'findAllProcessTemplateStepActions',
      pattern: MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
      permissions: ['process_templates.read'],
    },
    {
      method: 'findOneProcessTemplateStepAction',
      pattern: MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
      permissions: ['process_templates.read'],
    },
    {
      method: 'updateProcessTemplateStepAction',
      pattern: MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
      permissions: ['process_templates.update'],
    },
    {
      method: 'removeProcessTemplateStepAction',
      pattern: MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
      permissions: ['process_templates.update'],
    },
  ];

  it.each(cases)(
    '$method requires $permissions',
    ({ method, permissions }) => {
      const required = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        ProcessTemplateStepActionsController.prototype[method],
      );
      expect(required).toEqual(permissions);
    },
  );
});
