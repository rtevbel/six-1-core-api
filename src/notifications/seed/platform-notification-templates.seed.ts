import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';

export interface PlatformNotificationTemplateSeedEntry {
  /** Stable unique template name (idempotent upsert key). */
  key: string;
  name: string;
  subject: string;
  message: string;
  requiredPaths: string[];
}

export interface PlatformNotificationRuleSeedEntry {
  eventName: string;
  templateKey: string;
  recipientSpec: Record<string, unknown>;
  filterJson?: Record<string, unknown> | null;
  priority?: number;
}

/** Meta fields written during email-verification token issue/confirm — not profile edits. */
export const VERIFICATION_META_CHANGED_FIELD_NAMES = [
  'verification_token',
  'token_expires_at',
  'email_verified',
  'activationKey',
] as const;

/** Skip tenant-admin profile notifications when only verification meta changed. */
export const CUSTOMER_PROFILE_UPDATED_RULE_FILTER: Record<string, unknown> = {
  and: [
    { '==': [{ var: 'data.objectType' }, 'customer'] },
    {
      '!!': {
        filter: [
          { var: 'data.changedFields' },
          {
            '!': {
              in: [{ var: '' }, [...VERIFICATION_META_CHANGED_FIELD_NAMES]],
            },
          },
        ],
      },
    },
  ],
};

export const PLATFORM_NOTIFICATION_TEMPLATE_SEED: PlatformNotificationTemplateSeedEntry[] =
  [
    {
      key: 'customer_onboarding_step_ready',
      name: 'Customer onboarding — step ready',
      subject: 'Action required: {{process.stepName}}',
      message: [
        'Hello {{recipient.name}},',
        '',
        'The customer onboarding step "{{process.stepName}}" is ready for your action.',
        '{{#if entity.fields.companyName}}Customer: {{entity.fields.companyName}}{{/if}}',
        '',
        '{{#if urls.processRunner}}Open the process runner: {{urls.processRunner}}{{/if}}',
      ].join('\n'),
      requiredPaths: [
        'recipient.name',
        'process.stepName',
        'entity.fields.companyName',
        'urls.processRunner',
      ],
    },
    {
      key: 'customer_onboarding_completed',
      name: 'Customer onboarding — completed',
      subject: 'Customer onboarding completed',
      message: [
        'Hello {{recipient.name}},',
        '',
        'The customer onboarding process has completed successfully.',
        '{{#if entity.fields.companyName}}Customer: {{entity.fields.companyName}}{{/if}}',
        '{{#if workflow.subjectType}}Subject: {{workflow.subjectType}} #{{workflow.subjectId}}{{/if}}',
      ].join('\n'),
      requiredPaths: [
        'recipient.name',
        'entity.fields.companyName',
        'workflow.subjectType',
        'workflow.subjectId',
      ],
    },
    {
      key: 'customer_profile_updated',
      name: 'Customer profile updated',
      subject:
        'Customer profile updated{{#if entity.fields.companyName}} — {{entity.fields.companyName}}{{/if}}',
      message: [
        'Hello {{recipient.name}},',
        '',
        '{{#if entity.fields.companyName}}The customer profile for {{entity.fields.companyName}} was updated.{{else}}A customer profile was updated.{{/if}}',
        '{{#if payload.changedFields}}Changed fields: {{payload.changedFields}}{{/if}}',
      ].join('\n'),
      requiredPaths: ['recipient.name'],
    },
    {
      key: 'customer_email_verification',
      name: 'Customer email verification',
      subject: 'Verify your email',
      message: [
        'Hello {{recipient.name}},',
        '',
        'Please verify your email to continue.',
        '',
        'Verify here: {{urls.verification}}',
        '',
        'Or use: {{url "verification"}}',
      ].join('\n'),
      requiredPaths: [
        'recipient.name',
        'urls.verification',
        'entity.fields.verification_token',
      ],
    },
    {
      key: 'tenant_email_verification_requested',
      name: 'Tenant email verification — requested',
      subject: 'Verify your email address',
      message: [
        'Hello {{recipient.name}},',
        '',
        'Please verify your email{{#if tenant.name}} for {{tenant.name}}{{/if}}.',
        '',
        'Verify here: {{urls.verification}}',
        '',
        'Or use: {{url "verification"}}',
        '',
        'This link expires in {{payload.expiryHours}} hours.',
        '{{#if payload.loginUrl}}',
        'After verification, sign in at: {{payload.loginUrl}}',
        '{{/if}}',
      ].join('\n'),
      requiredPaths: [
        'recipient.name',
        'tenant.name',
        'urls.verification',
        'payload.expiryHours',
        'payload.loginUrl',
      ],
    },
    {
      key: 'tenant_email_verified',
      name: 'Tenant email verification — confirmed',
      subject: 'Your email is verified',
      message: [
        'Hello {{recipient.name}},',
        '',
        'Your email address has been verified successfully.',
        '{{#if payload.loginUrl}}Sign in at: {{payload.loginUrl}}{{/if}}',
      ].join('\n'),
      requiredPaths: ['recipient.name', 'payload.loginUrl'],
    },
  ];

export const PLATFORM_NOTIFICATION_RULE_SEED: PlatformNotificationRuleSeedEntry[] =
  [
    {
      eventName: PLATFORM_EVENT_NAMES.PROCESS_STEP_READY,
      templateKey: 'customer_onboarding_step_ready',
      recipientSpec: { type: 'assignee' },
      filterJson: { '!!': [{ var: 'data.assigneeId' }] },
      priority: 100,
    },
    {
      eventName: PLATFORM_EVENT_NAMES.PROCESS_COMPLETED,
      templateKey: 'customer_onboarding_completed',
      recipientSpec: { type: 'tenant_admins' },
      filterJson: { '==': [{ var: 'data.subjectType' }, 'customer'] },
      priority: 100,
    },
    {
      eventName: PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED,
      templateKey: 'customer_profile_updated',
      recipientSpec: { type: 'tenant_admins' },
      filterJson: CUSTOMER_PROFILE_UPDATED_RULE_FILTER,
      priority: 100,
    },
    {
      eventName: PLATFORM_EVENT_NAMES.PROCESS_STEP_READY,
      templateKey: 'customer_email_verification',
      recipientSpec: { type: 'workflow_customer_email' },
      filterJson: { '!!': [{ var: 'refs.customerCoreId' }] },
      priority: 110,
    },
    {
      eventName: PLATFORM_EVENT_NAMES.TENANT_EMAIL_VERIFICATION_REQUESTED,
      templateKey: 'tenant_email_verification_requested',
      recipientSpec: { type: 'event_actor' },
      priority: 100,
    },
    {
      eventName: PLATFORM_EVENT_NAMES.TENANT_EMAIL_VERIFIED,
      templateKey: 'tenant_email_verified',
      recipientSpec: { type: 'event_actor' },
      priority: 100,
    },
  ];
