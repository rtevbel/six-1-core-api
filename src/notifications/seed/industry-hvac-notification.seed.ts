import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import type {
  PlatformNotificationRuleSeedEntry,
  PlatformNotificationTemplateSeedEntry,
} from './platform-notification-templates.seed';

export const INDUSTRY_HVAC_NOTIFICATION_TEMPLATE_SEED: PlatformNotificationTemplateSeedEntry[] =
  [
    {
      key: 'hvac_install_step_ready',
      name: 'HVAC install — step ready',
      subject: 'Install job: {{process.stepName}} is ready',
      message: [
        'Hello {{recipient.name}},',
        '',
        'The HVAC install step "{{process.stepName}}" is ready for your action.',
        '{{#if workflow.subjectType}}Job subject: {{workflow.subjectType}} #{{workflow.subjectId}}{{/if}}',
        '',
        '{{#if urls.processRunner}}Open the process runner: {{urls.processRunner}}{{/if}}',
      ].join('\n'),
      requiredPaths: [
        'recipient.name',
        'process.stepName',
        'workflow.subjectType',
        'workflow.subjectId',
        'urls.processRunner',
      ],
    },
    {
      key: 'hvac_install_scheduled',
      name: 'HVAC install — visit scheduled',
      subject: 'Install visit scheduled',
      message: [
        'Hello {{recipient.name}},',
        '',
        'An HVAC install visit has been scheduled.',
        '{{#if process.stepName}}Step: {{process.stepName}}{{/if}}',
        '{{#if urls.processRunner}}Open the process runner: {{urls.processRunner}}{{/if}}',
      ].join('\n'),
      requiredPaths: ['recipient.name', 'process.stepName', 'urls.processRunner'],
    },
    {
      key: 'hvac_install_completed',
      name: 'HVAC install — completed',
      subject: 'HVAC install job completed',
      message: [
        'Hello {{recipient.name}},',
        '',
        'The HVAC install process has completed.',
        '{{#if workflow.subjectType}}Subject: {{workflow.subjectType}} #{{workflow.subjectId}}{{/if}}',
      ].join('\n'),
      requiredPaths: [
        'recipient.name',
        'workflow.subjectType',
        'workflow.subjectId',
      ],
    },
    {
      key: 'tenant_onboarding_registered',
      name: 'Tenant onboarding — company registered',
      subject: 'Your company is registered{{#if tenant.name}} — {{tenant.name}}{{/if}}',
      message: [
        'Hello {{recipient.name}},',
        '',
        'Your company has been registered.',
        '{{#if tenant.name}}Company: {{tenant.name}}{{/if}}',
        '{{#if payload.loginUrl}}Sign in at: {{payload.loginUrl}}{{/if}}',
      ].join('\n'),
      requiredPaths: ['recipient.name', 'tenant.name'],
    },
    {
      key: 'tenant_user_invite',
      name: 'Tenant user invite',
      subject: 'You are invited to join {{tenant.name}}',
      message: [
        'Hello {{recipient.name}},',
        '',
        'You have been invited to join{{#if tenant.name}} {{tenant.name}}{{/if}}.',
        '{{#if urls.processRunner}}Continue onboarding: {{urls.processRunner}}{{/if}}',
        '{{#if payload.loginUrl}}Sign in at: {{payload.loginUrl}}{{/if}}',
      ].join('\n'),
      requiredPaths: ['recipient.name', 'tenant.name'],
    },
  ];

export const INDUSTRY_HVAC_NOTIFICATION_RULE_SEED: PlatformNotificationRuleSeedEntry[] =
  [
    {
      eventName: PLATFORM_EVENT_NAMES.PROCESS_STEP_READY,
      templateKey: 'hvac_install_step_ready',
      recipientSpec: { type: 'assignee' },
      filterJson: {
        and: [
          { '!!': [{ var: 'data.assigneeId' }] },
          {
            in: [
              { var: 'data.stepName' },
              [
                'Confirm customer',
                'Site survey',
                'Create / confirm install job',
                'Install + checklist',
                'Commission and close',
              ],
            ],
          },
        ],
      },
      priority: 120,
    },
    {
      eventName: PLATFORM_EVENT_NAMES.PROCESS_STEP_READY,
      templateKey: 'hvac_install_scheduled',
      recipientSpec: { type: 'assignee' },
      filterJson: { '==': [{ var: 'data.stepName' }, 'Schedule visit'] },
      priority: 120,
    },
    {
      eventName: PLATFORM_EVENT_NAMES.PROCESS_COMPLETED,
      templateKey: 'hvac_install_completed',
      recipientSpec: { type: 'tenant_admins' },
      filterJson: { '==': [{ var: 'data.subjectType' }, 'project'] },
      priority: 120,
    },
    {
      eventName: PLATFORM_EVENT_NAMES.TENANT_CREATED,
      templateKey: 'tenant_onboarding_registered',
      recipientSpec: { type: 'event_actor' },
      priority: 120,
    },
    {
      eventName: PLATFORM_EVENT_NAMES.PROCESS_STEP_READY,
      templateKey: 'tenant_user_invite',
      recipientSpec: { type: 'tenant_admins' },
      filterJson: { '==': [{ var: 'data.stepName' }, 'Invite first users'] },
      priority: 120,
    },
  ];
